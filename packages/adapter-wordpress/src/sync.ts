import { chunkPost } from "./content-chunker";
import {
  createConnection,
  deleteOrphanedSlugs,
  deletePostChunks,
  readSyncState,
  upsertChunks,
  writeSyncState,
} from "./db";
import { fetchAllPosts, fetchPostsModifiedAfter } from "./wp-client";
import type { AdapterConfig, ContentChunk, SyncResult, WpPost } from "./types";

function buildScope(siteUrl: string): string {
  const hostname = new URL(siteUrl).hostname;
  return `wp:${hostname}`;
}

export async function syncFull(config: AdapterConfig, dryRun = false): Promise<SyncResult> {
  console.log(`[wp-sync] 全量同步开始: 站点=${config.wpSiteUrl}, 表=${config.tidbTableName}`);
  const connection = createConnection(config.tidbDatabaseUrl);
  const scope = buildScope(config.wpSiteUrl);
  const result: SyncResult = { totalPosts: 0, totalChunks: 0, upserted: 0, deleted: 0, errors: [] };

  const allChunks: ContentChunk[] = [];

  for await (const posts of fetchAllPosts(config)) {
    for (const post of posts) {
      result.totalPosts++;
      try {
        const chunks = chunkPost(post, config);
        allChunks.push(...chunks);
      } catch (error) {
        result.errors.push(`分块失败 [${post.slug}]: ${String(error)}`);
      }
    }
  }

  result.totalChunks = allChunks.length;
  console.log(`拉取完成: ${result.totalPosts} 篇文章，${result.totalChunks} 个分块`);

  if (dryRun) {
    console.log("[dry-run] 跳过数据库写入");
    return result;
  }

  // 批量 upsert
  result.upserted = await upsertChunks(connection, config.tidbTableName, allChunks, config.locale);

  // 清理孤立记录
  const activeSlugs = new Set(allChunks.map((c) => c.slug));
  result.deleted = await deleteOrphanedSlugs(connection, config.tidbTableName, activeSlugs, config.locale);

  // 更新同步状态
  await writeSyncState(connection, scope, new Date().toISOString());

  console.log(`同步完成: upserted=${result.upserted}, deleted=${result.deleted}`);
  return result;
}

export async function syncIncremental(config: AdapterConfig, dryRun = false): Promise<SyncResult> {
  console.log(`[wp-sync] 增量同步开始: 站点=${config.wpSiteUrl}, 表=${config.tidbTableName}`);
  const connection = createConnection(config.tidbDatabaseUrl);
  const scope = buildScope(config.wpSiteUrl);
  const result: SyncResult = { totalPosts: 0, totalChunks: 0, upserted: 0, deleted: 0, errors: [] };

  let lastSync: string | null = null;
  try {
    lastSync = await readSyncState(connection, scope);
  } catch (error) {
    console.error(`[wp-sync] 读取同步状态失败，回退到全量同步:`, error);
    return syncFull(config, dryRun);
  }
  if (!lastSync) {
    console.log("[wp-sync] 未找到上次同步记录，回退到全量同步");
    return syncFull(config, dryRun);
  }

  console.log(`增量同步: 从 ${lastSync} 开始`);

  const updatedPosts: WpPost[] = [];
  for await (const posts of fetchPostsModifiedAfter(config, lastSync)) {
    updatedPosts.push(...posts);
  }

  result.totalPosts = updatedPosts.length;

  if (updatedPosts.length === 0) {
    console.log("没有更新的文章");
    await writeSyncState(connection, scope, new Date().toISOString());
    return result;
  }

  for (const post of updatedPosts) {
    try {
      const chunks = chunkPost(post, config);
      result.totalChunks += chunks.length;

      if (dryRun) {
        continue;
      }

      // 先删旧 chunks，再插入新的
      const deletedCount = await deletePostChunks(connection, config.tidbTableName, post.slug, config.locale);
      result.deleted += deletedCount;

      const upsertedCount = await upsertChunks(connection, config.tidbTableName, chunks, config.locale);
      result.upserted += upsertedCount;
    } catch (error) {
      result.errors.push(`同步失败 [${post.slug}]: ${String(error)}`);
    }
  }

  if (dryRun) {
    console.log("[dry-run] 跳过数据库写入");
    return result;
  }

  await writeSyncState(connection, scope, new Date().toISOString());
  console.log(`增量同步完成: ${result.totalPosts} 篇, upserted=${result.upserted}, deleted=${result.deleted}`);
  return result;
}
