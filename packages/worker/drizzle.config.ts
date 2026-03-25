import { defineConfig } from "drizzle-kit";
import type { SslOptions } from "mysql2";

const databaseUrl = process.env.TIDB_DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "缺少 TIDB_DATABASE_URL。请先注入环境变量，例如：node --env-file-if-exists=.dev.vars ./node_modules/drizzle-kit/bin.cjs migrate --config drizzle.config.ts",
  );
}

const dbCredentials = parseMysqlConnectionString(databaseUrl);

export default defineConfig({
  dialect: "mysql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials,
  verbose: true,
  strict: true,
});

interface MysqlCredentials {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl?: SslOptions;
}

function parseMysqlConnectionString(connectionString: string): MysqlCredentials {
  const parsed = new URL(connectionString);
  const database = parsed.pathname.replace(/^\//, "");
  if (!database) {
    throw new Error("TIDB_DATABASE_URL 必须包含数据库名。");
  }

  const credentials: MysqlCredentials = {
    host: parsed.hostname,
    port: parsed.port ? Number.parseInt(parsed.port, 10) : 3306,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database,
  };

  if (requiresTls(parsed.hostname)) {
    credentials.ssl = {
      minVersion: "TLSv1.2",
      rejectUnauthorized: true,
    };
  }

  return credentials;
}

function requiresTls(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return normalized !== "localhost" && normalized !== "127.0.0.1" && normalized !== "::1";
}
