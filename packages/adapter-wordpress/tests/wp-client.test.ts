import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAllPosts, fetchPostsModifiedAfter } from "../src/wp-client";
import type { WpPost } from "../src/types";

function makeWpPost(id: number): WpPost {
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

const baseConfig = {
  wpSiteUrl: "https://blog.example.com",
  wpUsername: "admin",
  wpAppPassword: "xxxx xxxx xxxx",
  postsPerPage: 10,
};

describe("wp-client", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("fetchAllPosts", () => {
    it("拉取单页结果", async () => {
      const posts = [makeWpPost(1), makeWpPost(2)];
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify(posts), {
          headers: { "X-WP-TotalPages": "1" },
        }),
      );

      const results: WpPost[] = [];
      for await (const batch of fetchAllPosts(baseConfig)) {
        results.push(...batch);
      }

      expect(results).toHaveLength(2);
      expect(results[0]!.id).toBe(1);
    });

    it("分页拉取多页", async () => {
      const page1 = [makeWpPost(1)];
      const page2 = [makeWpPost(2)];

      vi.mocked(fetch)
        .mockResolvedValueOnce(
          new Response(JSON.stringify(page1), {
            headers: { "X-WP-TotalPages": "2" },
          }),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify(page2), {
            headers: { "X-WP-TotalPages": "2" },
          }),
        );

      const results: WpPost[] = [];
      for await (const batch of fetchAllPosts(baseConfig)) {
        results.push(...batch);
      }

      expect(results).toHaveLength(2);
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it("发送正确的 Authorization 头", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify([]), {
          headers: { "X-WP-TotalPages": "1" },
        }),
      );

      const results: WpPost[] = [];
      for await (const batch of fetchAllPosts(baseConfig)) {
        results.push(...batch);
      }

      const call = vi.mocked(fetch).mock.calls[0]!;
      const headers = call[1]?.headers as Record<string, string>;
      const expectedAuth = `Basic ${btoa("admin:xxxx xxxx xxxx")}`;
      expect(headers.Authorization).toBe(expectedAuth);
    });

    it("请求 URL 包含必要参数", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify([]), {
          headers: { "X-WP-TotalPages": "1" },
        }),
      );

      for await (const _batch of fetchAllPosts(baseConfig)) {
        // consume
      }

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain("/wp-json/wp/v2/posts");
      expect(url).toContain("per_page=10");
      expect(url).toContain("status=publish");
      expect(url).toContain("_fields=");
    });

    it("API 报错时抛出异常", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response("Unauthorized", { status: 401, statusText: "Unauthorized" }));

      await expect(async () => {
        for await (const _batch of fetchAllPosts(baseConfig)) {
          // consume
        }
      }).rejects.toThrow("WP API 请求失败: 401 Unauthorized");
    });
  });

  describe("fetchPostsModifiedAfter", () => {
    it("请求 URL 包含 modified_after 参数", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify([makeWpPost(1)]), {
          headers: { "X-WP-TotalPages": "1" },
        }),
      );

      const after = "2024-06-01T00:00:00";
      for await (const _batch of fetchPostsModifiedAfter(baseConfig, after)) {
        // consume
      }

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain("modified_after=2024-06-01T00%3A00%3A00");
    });
  });
});
