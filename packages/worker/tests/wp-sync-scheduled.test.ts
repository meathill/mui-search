import { describe, expect, it } from "vitest";
import { buildWpSyncConfig, isWpSyncConfigured } from "../src/services/wp-sync-scheduled";
import type { WorkerEnv } from "../src/types";

function makeEnv(overrides: Partial<WorkerEnv> = {}): WorkerEnv {
  return {
    ASSETS: {} as WorkerEnv["ASSETS"],
    TIDB_DATABASE_URL: "mysql://localhost/test",
    ...overrides,
  };
}

describe("wp-sync-scheduled", () => {
  describe("isWpSyncConfigured", () => {
    it("三个 WP 变量都有时返回 true", () => {
      const env = makeEnv({
        WP_SITE_URL: "https://example.com",
        WP_USERNAME: "admin",
        WP_APP_PASSWORD: "xxxx",
      });
      expect(isWpSyncConfigured(env)).toBe(true);
    });

    it("缺少任一变量返回 false", () => {
      expect(isWpSyncConfigured(makeEnv({ WP_SITE_URL: "https://example.com" }))).toBe(false);
      expect(isWpSyncConfigured(makeEnv({ WP_USERNAME: "admin" }))).toBe(false);
      expect(isWpSyncConfigured(makeEnv())).toBe(false);
    });
  });

  describe("buildWpSyncConfig", () => {
    it("从 env 构建完整配置", () => {
      const env = makeEnv({
        WP_SITE_URL: "https://blog.example.com/",
        WP_USERNAME: "admin",
        WP_APP_PASSWORD: "xxxx xxxx",
        WP_LOCALE: "en",
        WP_CHUNK_MAX_LENGTH: "3000",
        WP_POSTS_PER_PAGE: "20",
        TIDB_TABLE_NAME: "my_docs",
      });

      const config = buildWpSyncConfig(env);
      expect(config.wpSiteUrl).toBe("https://blog.example.com");
      expect(config.wpUsername).toBe("admin");
      expect(config.wpAppPassword).toBe("xxxx xxxx");
      expect(config.locale).toBe("en");
      expect(config.chunkMaxLength).toBe(3000);
      expect(config.postsPerPage).toBe(20);
      expect(config.tidbTableName).toBe("my_docs");
    });

    it("使用默认值", () => {
      const env = makeEnv({
        WP_SITE_URL: "https://example.com",
        WP_USERNAME: "admin",
        WP_APP_PASSWORD: "xxxx",
      });

      const config = buildWpSyncConfig(env);
      expect(config.locale).toBe("zh");
      expect(config.chunkMaxLength).toBe(2000);
      expect(config.postsPerPage).toBe(50);
      expect(config.tidbTableName).toBe("documents");
    });

    it("缺少必需变量时抛出异常", () => {
      expect(() => buildWpSyncConfig(makeEnv())).toThrow("WP 同步配置不完整");
    });
  });
});
