import type { AdapterConfig } from "./types";

const REQUIRED_ENV_VARS = ["WP_SITE_URL", "WP_USERNAME", "WP_APP_PASSWORD", "TIDB_DATABASE_URL"] as const;

export function loadConfig(): AdapterConfig {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`缺少必需的环境变量: ${missing.join(", ")}`);
  }

  const wpSiteUrl = process.env.WP_SITE_URL!.replace(/\/+$/, "");
  const chunkMaxLength = Number.parseInt(process.env.CHUNK_MAX_LENGTH ?? "2000", 10);
  const postsPerPage = Number.parseInt(process.env.WP_POSTS_PER_PAGE ?? "50", 10);

  if (chunkMaxLength < 200 || chunkMaxLength > 10000) {
    throw new Error(`CHUNK_MAX_LENGTH 应在 200 到 10000 之间，当前值: ${chunkMaxLength}`);
  }

  if (postsPerPage < 1 || postsPerPage > 100) {
    throw new Error(`WP_POSTS_PER_PAGE 应在 1 到 100 之间，当前值: ${postsPerPage}`);
  }

  const config: AdapterConfig = {
    wpSiteUrl,
    wpUsername: process.env.WP_USERNAME!,
    wpAppPassword: process.env.WP_APP_PASSWORD!,
    tidbDatabaseUrl: process.env.TIDB_DATABASE_URL!,
    tidbTableName: process.env.TIDB_TABLE_NAME ?? "documents",
    locale: process.env.WP_LOCALE ?? "zh",
    chunkMaxLength,
    postsPerPage,
  };
  if (process.env.WP_CF_ACCESS_CLIENT_ID && process.env.WP_CF_ACCESS_CLIENT_SECRET) {
    config.cfAccessClientId = process.env.WP_CF_ACCESS_CLIENT_ID;
    config.cfAccessClientSecret = process.env.WP_CF_ACCESS_CLIENT_SECRET;
  }
  return config;
}
