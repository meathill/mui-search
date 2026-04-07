import { syncIncremental, syncFull } from "@mui-search/adapter-wordpress/sync";
import type { AdapterConfig } from "@mui-search/adapter-wordpress/types";
import type { WorkerEnv } from "../types";

const DEFAULT_CHUNK_MAX_LENGTH = 2000;
const DEFAULT_POSTS_PER_PAGE = 50;
const DEFAULT_LOCALE = "zh";

export function isWpSyncConfigured(env: WorkerEnv): boolean {
  return !!(env.WP_SITE_URL && env.WP_USERNAME && env.WP_APP_PASSWORD);
}

export function buildWpSyncConfig(env: WorkerEnv): AdapterConfig {
  if (!env.WP_SITE_URL || !env.WP_USERNAME || !env.WP_APP_PASSWORD) {
    throw new Error("WP 同步配置不完整: 需要 WP_SITE_URL, WP_USERNAME, WP_APP_PASSWORD");
  }

  return {
    wpSiteUrl: env.WP_SITE_URL.replace(/\/+$/, ""),
    wpUsername: env.WP_USERNAME,
    wpAppPassword: env.WP_APP_PASSWORD,
    tidbDatabaseUrl: env.TIDB_DATABASE_URL,
    tidbTableName: env.TIDB_TABLE_NAME ?? "documents",
    locale: env.WP_LOCALE ?? DEFAULT_LOCALE,
    chunkMaxLength: parsePositiveInt(env.WP_CHUNK_MAX_LENGTH, DEFAULT_CHUNK_MAX_LENGTH),
    postsPerPage: parsePositiveInt(env.WP_POSTS_PER_PAGE, DEFAULT_POSTS_PER_PAGE),
  };
}

export async function runWpSync(env: WorkerEnv, mode: "incremental" | "full" = "incremental"): Promise<string> {
  if (!isWpSyncConfigured(env)) {
    const missing = [
      !env.WP_SITE_URL && "WP_SITE_URL",
      !env.WP_USERNAME && "WP_USERNAME",
      !env.WP_APP_PASSWORD && "WP_APP_PASSWORD",
    ].filter(Boolean);
    console.warn(`[wp-sync] 配置不完整，跳过。缺失: ${missing.join(", ")}`);
    return "WP 同步未配置，跳过";
  }

  const config = buildWpSyncConfig(env);
  console.log(`[wp-sync] 开始${mode === "full" ? "全量" : "增量"}同步: ${config.wpSiteUrl}`);

  const result = mode === "full" ? await syncFull(config) : await syncIncremental(config);

  const summary = `[wp-sync] 完成: ${result.totalPosts} 篇文章, ${result.totalChunks} 个分块, upserted=${result.upserted}, deleted=${result.deleted}`;
  console.log(summary);

  if (result.errors.length > 0) {
    console.error(`[wp-sync] ${result.errors.length} 个错误:`, result.errors);
  }

  return summary;
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
