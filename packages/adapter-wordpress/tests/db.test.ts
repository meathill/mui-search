import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteOrphanedSlugs,
  deletePostChunks,
  readSyncState,
  upsertChunks,
  writeSyncState,
  type DbConnection,
} from "../src/db";
import type { ContentChunk } from "../src/types";

function makeMockConnection(): DbConnection {
  return {
    execute: vi.fn().mockResolvedValue([]),
  };
}

function makeChunk(slug: string, overrides: Partial<ContentChunk> = {}): ContentChunk {
  return {
    slug,
    title: `标题 ${slug}`,
    description: "摘要",
    content: `内容 ${slug}`,
    sourcePath: `https://example.com/${slug}`,
    publishedAt: null,
    categoryName: null,
    readingTimeMinutes: null,
    ...overrides,
  };
}

describe("db", () => {
  let connection: DbConnection;

  beforeEach(() => {
    connection = makeMockConnection();
  });

  describe("upsertChunks", () => {
    it("空 chunks 返回 0", async () => {
      const result = await upsertChunks(connection, "documents", [], "zh");
      expect(result).toBe(0);
      expect(connection.execute).not.toHaveBeenCalled();
    });

    it("逐条执行 upsert SQL", async () => {
      const chunks = [makeChunk("post-1"), makeChunk("post-2")];
      const result = await upsertChunks(connection, "documents", chunks, "zh");
      expect(result).toBe(2);
      expect(connection.execute).toHaveBeenCalledTimes(2);
    });

    it("SQL 包含正确的参数", async () => {
      const chunk = makeChunk("my-post", {
        publishedAt: "2024-01-01T00:00:00",
        categoryName: "前端",
        readingTimeMinutes: 3,
      });
      await upsertChunks(connection, "documents", [chunk], "en");

      const call = vi.mocked(connection.execute).mock.calls[0]!;
      const sql = call[0] as string;
      const params = call[1] as unknown[];

      expect(sql).toContain("INSERT INTO documents");
      expect(sql).toContain("ON DUPLICATE KEY UPDATE");
      expect(sql).toContain("published_at");
      expect(sql).toContain("category_name");
      expect(sql).toContain("reading_time_minutes");
      expect(params).toEqual([
        "my-post",
        "en",
        "标题 my-post",
        "摘要",
        "内容 my-post",
        "https://example.com/my-post",
        "2024-01-01T00:00:00",
        "前端",
        3,
      ]);
    });
  });

  describe("deletePostChunks", () => {
    it("删除文章及其所有 chunks", async () => {
      vi.mocked(connection.execute).mockResolvedValueOnce({ affectedRows: 3 });
      const result = await deletePostChunks(connection, "documents", "my-post", "zh");
      expect(result).toBe(3);

      const call = vi.mocked(connection.execute).mock.calls[0]!;
      const params = call[1] as unknown[];
      expect(params).toEqual(["my-post", "my-post#%", "zh"]);
    });
  });

  describe("deleteOrphanedSlugs", () => {
    it("activeSlugs 为空时返回 0", async () => {
      const result = await deleteOrphanedSlugs(connection, "documents", new Set(), "zh");
      expect(result).toBe(0);
    });

    it("没有孤立 slug 时返回 0", async () => {
      vi.mocked(connection.execute).mockResolvedValueOnce([{ slug: "post-1" }, { slug: "post-2" }]);
      const result = await deleteOrphanedSlugs(connection, "documents", new Set(["post-1", "post-2"]), "zh");
      expect(result).toBe(0);
      // 只执行了查询，没有删除
      expect(connection.execute).toHaveBeenCalledTimes(1);
    });

    it("删除不在 activeSlugs 中的 slug", async () => {
      vi.mocked(connection.execute)
        .mockResolvedValueOnce([{ slug: "post-1" }, { slug: "post-2" }, { slug: "post-3" }])
        .mockResolvedValueOnce({ affectedRows: 2 });

      const result = await deleteOrphanedSlugs(connection, "documents", new Set(["post-1"]), "zh");
      expect(result).toBe(2);
      expect(connection.execute).toHaveBeenCalledTimes(2);
    });
  });

  describe("readSyncState", () => {
    it("有记录时返回 source_commit", async () => {
      vi.mocked(connection.execute).mockResolvedValueOnce([{ source_commit: "2024-01-01T00:00:00Z" }]);
      const result = await readSyncState(connection, "wp:example.com");
      expect(result).toBe("2024-01-01T00:00:00Z");
    });

    it("无记录时返回 null", async () => {
      vi.mocked(connection.execute).mockResolvedValueOnce([]);
      const result = await readSyncState(connection, "wp:example.com");
      expect(result).toBeNull();
    });
  });

  describe("writeSyncState", () => {
    it("执行 upsert SQL", async () => {
      await writeSyncState(connection, "wp:example.com", "2024-06-01T00:00:00Z");
      expect(connection.execute).toHaveBeenCalledTimes(1);

      const call = vi.mocked(connection.execute).mock.calls[0]!;
      const sql = call[0] as string;
      expect(sql).toContain("INSERT INTO seed_sync_state");
      expect(sql).toContain("ON DUPLICATE KEY UPDATE");
    });
  });
});
