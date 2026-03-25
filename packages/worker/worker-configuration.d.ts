// 由 `wrangler types` 生成的类型定义模板。
// 运行 `pnpm run types:worker` 以根据你的 wrangler.jsonc 重新生成。
declare namespace Cloudflare {
  interface Env {
    KV: KVNamespace;
    DB: D1Database;
    ASSETS: Fetcher;
    PUBLIC_URL: string;
    TIDB_TABLE_NAME: string;
    TIDB_DATABASE_URL: string;
  }
}
interface Env extends Cloudflare.Env {}
