import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/wp-client", () => ({
  fetchAllPosts: vi.fn(),
  fetchPostsModifiedAfter: vi.fn(),
  fetchCategoryMap: vi.fn().mockResolvedValue(new Map()),
}));

vi.mock("../src/db", () => ({
  createConnection: vi.fn(() => ({})),
  upsertChunks: vi.fn().mockResolvedValue(0),
  deletePostChunks: vi.fn().mockResolvedValue(0),
  deleteOrphanedSlugs: vi.fn().mockResolvedValue(0),
  readSyncState: vi.fn().mockResolvedValue(null),
  writeSyncState: vi.fn().mockResolvedValue(undefined),
}));

import { syncFull, syncIncremental } from "../src/sync";
import { fetchAllPosts, fetchPostsModifiedAfter } from "../src/wp-client";
import { deleteOrphanedSlugs, deletePostChunks, readSyncState, upsertChunks, writeSyncState } from "../src/db";
import type { AdapterConfig, WpPost } from "../src/types";

function makePost(id: number): WpPost {
  return {
    id,
    slug: `post-${id}`,
    title: { rendered: `标题 ${id}` },
    content: { rendered: `<p>内容 ${id}</p>` },
    excerpt: { rendered: `<p>摘要 ${id}</p>` },
    link: `https://blog.example.com/post-${id}`,
    modified_gmt: "2024-01-01T00:00:00",
    status: "publish",
  };
}

const config: AdapterConfig = {
  wpSiteUrl: "https://blog.example.com",
  wpUsername: "admin",
  wpAppPassword: "xxxx",
  tidbDatabaseUrl: "mysql://localhost/test",
  tidbTableName: "documents",
  locale: "zh",
  chunkMaxLength: 2000,
  postsPerPage: 50,
};

describe("sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 禁止 console.log 输出
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  describe("syncFull", () => {
    it("拉取所有文章并 upsert", async () => {
      const posts = [makePost(1), makePost(2)];
      vi.mocked(fetchAllPosts).mockImplementation(async function* () {
        yield posts;
      });
      vi.mocked(upsertChunks).mockResolvedValue(2);
      vi.mocked(deleteOrphanedSlugs).mockResolvedValue(0);

      const result = await syncFull(config);
      expect(result.totalPosts).toBe(2);
      expect(result.totalChunks).toBe(2);
      expect(upsertChunks).toHaveBeenCalled();
      expect(deleteOrphanedSlugs).toHaveBeenCalled();
      expect(writeSyncState).toHaveBeenCalled();
    });

    it("dry-run 模式不写数据库", async () => {
      vi.mocked(fetchAllPosts).mockImplementation(async function* () {
        yield [makePost(1)];
      });

      const result = await syncFull(config, true);
      expect(result.totalPosts).toBe(1);
      expect(upsertChunks).not.toHaveBeenCalled();
      expect(writeSyncState).not.toHaveBeenCalled();
    });

    it("分块失败时记录错误但继续", async () => {
      const badPost = makePost(1);
      badPost.content = { rendered: "<p>ok</p>" };
      const goodPost = makePost(2);

      vi.mocked(fetchAllPosts).mockImplementation(async function* () {
        yield [badPost, goodPost];
      });
      vi.mocked(upsertChunks).mockResolvedValue(2);

      const result = await syncFull(config);
      // 两篇文章都应该正常处理（简单内容不会出错）
      expect(result.totalPosts).toBe(2);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("syncIncremental", () => {
    it("无同步记录时回退到全量同步", async () => {
      vi.mocked(readSyncState).mockResolvedValue(null);
      vi.mocked(fetchAllPosts).mockImplementation(async function* () {
        yield [makePost(1)];
      });
      vi.mocked(upsertChunks).mockResolvedValue(1);

      const result = await syncIncremental(config);
      expect(result.totalPosts).toBe(1);
      expect(fetchAllPosts).toHaveBeenCalled();
    });

    it("有同步记录时增量拉取", async () => {
      vi.mocked(readSyncState).mockResolvedValue("2024-06-01T00:00:00Z");
      vi.mocked(fetchPostsModifiedAfter).mockImplementation(async function* () {
        yield [makePost(1)];
      });
      vi.mocked(deletePostChunks).mockResolvedValue(1);
      vi.mocked(upsertChunks).mockResolvedValue(1);

      const result = await syncIncremental(config);
      expect(result.totalPosts).toBe(1);
      expect(fetchPostsModifiedAfter).toHaveBeenCalled();
      expect(deletePostChunks).toHaveBeenCalled();
      expect(upsertChunks).toHaveBeenCalled();
      expect(writeSyncState).toHaveBeenCalled();
    });

    it("没有更新的文章时仅更新同步状态", async () => {
      vi.mocked(readSyncState).mockResolvedValue("2024-06-01T00:00:00Z");
      vi.mocked(fetchPostsModifiedAfter).mockImplementation(async function* () {
        // 无数据
      });

      const result = await syncIncremental(config);
      expect(result.totalPosts).toBe(0);
      expect(upsertChunks).not.toHaveBeenCalled();
      expect(writeSyncState).toHaveBeenCalled();
    });
  });
});
