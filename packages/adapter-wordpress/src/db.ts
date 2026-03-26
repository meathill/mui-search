import { connect } from "@tidbcloud/serverless";
import type { ContentChunk } from "./types";

export interface DbConnection {
  execute(sql: string, params?: unknown[]): Promise<unknown>;
}

export function createConnection(databaseUrl: string): DbConnection {
  return connect({ url: databaseUrl });
}

export async function upsertChunks(
  connection: DbConnection,
  tableName: string,
  chunks: ContentChunk[],
  locale: string,
): Promise<number> {
  if (chunks.length === 0) {
    return 0;
  }

  let upserted = 0;

  // 逐条 upsert，避免单次 SQL 过大
  for (const chunk of chunks) {
    await connection.execute(
      `INSERT INTO ${tableName} (slug, locale, title, description, content, source_path)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         title = VALUES(title),
         description = VALUES(description),
         content = VALUES(content),
         source_path = VALUES(source_path)`,
      [chunk.slug, locale, chunk.title, chunk.description, chunk.content, chunk.sourcePath],
    );
    upserted++;
  }

  return upserted;
}

export async function deletePostChunks(
  connection: DbConnection,
  tableName: string,
  postSlug: string,
  locale: string,
): Promise<number> {
  const result = (await connection.execute(`DELETE FROM ${tableName} WHERE (slug = ? OR slug LIKE ?) AND locale = ?`, [
    postSlug,
    `${postSlug}#%`,
    locale,
  ])) as { affectedRows?: number };

  return result.affectedRows ?? 0;
}

export async function deleteOrphanedSlugs(
  connection: DbConnection,
  tableName: string,
  activeSlugs: Set<string>,
  locale: string,
): Promise<number> {
  if (activeSlugs.size === 0) {
    return 0;
  }

  // 查出当前 locale 的所有 slug
  const rows = (await connection.execute(`SELECT DISTINCT slug FROM ${tableName} WHERE locale = ?`, [
    locale,
  ])) as Array<{ slug: string }>;

  const orphanedSlugs = rows.map((r) => r.slug).filter((slug) => !activeSlugs.has(slug));

  if (orphanedSlugs.length === 0) {
    return 0;
  }

  const placeholders = orphanedSlugs.map(() => "?").join(", ");
  const result = (await connection.execute(`DELETE FROM ${tableName} WHERE slug IN (${placeholders}) AND locale = ?`, [
    ...orphanedSlugs,
    locale,
  ])) as { affectedRows?: number };

  return result.affectedRows ?? 0;
}

export async function readSyncState(connection: DbConnection, scope: string): Promise<string | null> {
  const rows = (await connection.execute(`SELECT source_commit FROM seed_sync_state WHERE scope = ?`, [
    scope,
  ])) as Array<{ source_commit: string }>;

  return rows[0]?.source_commit ?? null;
}

export async function writeSyncState(connection: DbConnection, scope: string, sourceCommit: string): Promise<void> {
  await connection.execute(
    `INSERT INTO seed_sync_state (scope, source_commit, updated_at)
     VALUES (?, ?, NOW())
     ON DUPLICATE KEY UPDATE
       source_commit = VALUES(source_commit),
       updated_at = NOW()`,
    [scope, sourceCommit],
  );
}
