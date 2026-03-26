import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadConfig } from "../src/config";

describe("loadConfig", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.WP_SITE_URL = "https://blog.example.com";
    process.env.WP_USERNAME = "admin";
    process.env.WP_APP_PASSWORD = "xxxx xxxx xxxx";
    process.env.TIDB_DATABASE_URL = "mysql://user:pass@host:4000/db";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("用必需环境变量加载默认配置", () => {
    const config = loadConfig();
    expect(config.wpSiteUrl).toBe("https://blog.example.com");
    expect(config.wpUsername).toBe("admin");
    expect(config.wpAppPassword).toBe("xxxx xxxx xxxx");
    expect(config.tidbDatabaseUrl).toBe("mysql://user:pass@host:4000/db");
    expect(config.tidbTableName).toBe("documents");
    expect(config.locale).toBe("zh");
    expect(config.chunkMaxLength).toBe(2000);
    expect(config.postsPerPage).toBe(50);
  });

  it("去除 WP_SITE_URL 末尾斜杠", () => {
    process.env.WP_SITE_URL = "https://blog.example.com///";
    const config = loadConfig();
    expect(config.wpSiteUrl).toBe("https://blog.example.com");
  });

  it("缺少必需环境变量时抛出异常", () => {
    delete process.env.WP_SITE_URL;
    delete process.env.WP_USERNAME;
    expect(() => loadConfig()).toThrow("缺少必需的环境变量: WP_SITE_URL, WP_USERNAME");
  });

  it("CHUNK_MAX_LENGTH 超范围时抛出异常", () => {
    process.env.CHUNK_MAX_LENGTH = "50";
    expect(() => loadConfig()).toThrow("CHUNK_MAX_LENGTH 应在 200 到 10000 之间");
  });

  it("WP_POSTS_PER_PAGE 超范围时抛出异常", () => {
    process.env.WP_POSTS_PER_PAGE = "200";
    expect(() => loadConfig()).toThrow("WP_POSTS_PER_PAGE 应在 1 到 100 之间");
  });

  it("使用自定义环境变量", () => {
    process.env.TIDB_TABLE_NAME = "my_docs";
    process.env.WP_LOCALE = "en";
    process.env.CHUNK_MAX_LENGTH = "3000";
    process.env.WP_POSTS_PER_PAGE = "20";
    const config = loadConfig();
    expect(config.tidbTableName).toBe("my_docs");
    expect(config.locale).toBe("en");
    expect(config.chunkMaxLength).toBe(3000);
    expect(config.postsPerPage).toBe(20);
  });
});
