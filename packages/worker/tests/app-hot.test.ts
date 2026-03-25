import { describe, expect, it, vi } from "vitest";

import type { HotContentItem } from "@mui-search/shared";
import { createWorkerApp } from "../src/app";
import { buildCanonicalApiGetRequest } from "../src/response-cache";
import { buildDependencies, createMockApiDataCache, createMockResponseCache } from "./app-test-helpers";

describe("createWorkerApp hot 接口", () => {
  it("hot 接口通过 fetch GA4 获取热门内容并返回前 10 条", async () => {
    const mockFetch = vi.spyOn(global, "fetch").mockImplementation(async (url) => {
      if (typeof url === "string" && url.includes("/en/ga4-top100.json")) {
        return new Response(
          JSON.stringify({
            updated_at: "2026-02-27T09:00:00.000Z",
            items: Array.from({ length: 15 }, (_, i) => ({
              slug: `test-game-${i}`,
              title: `Test Game ${i}`,
              views: 100 - i,
            })),
          }),
        );
      }
      return new Response("Not Found", { status: 404 });
    });

    const app = createWorkerApp(buildDependencies());
    const response = await app.fetch(new Request("https://worker.test/api/hot?locale=en"));
    const payload = (await response.json()) as {
      success: boolean;
      data: HotContentItem[];
    };

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("public, max-age=43200");
    expect(payload.success).toBe(true);
    expect(payload.data).toHaveLength(10);
    expect(payload.data[0]?.contentId).toBe("test-game-0");
    expect(payload.data[0]?.hitCount).toBe(100);
    expect(payload.data[0]?.contentUrl).toBe("https://www.example.com/test-game-0/en/");

    mockFetch.mockRestore();
  });

  it("hot 接口应过滤 locale 不匹配的 GA4 条目", async () => {
    const mockFetch = vi.spyOn(global, "fetch").mockImplementation(async (url) => {
      if (typeof url === "string" && url.includes("/cn/ga4-top100.json")) {
        return new Response(
          JSON.stringify({
            updated_at: "2026-02-27T09:00:00.000Z",
            items: [
              {
                slug: "math-quiz/cn",
                title: "CN Game",
                views: 100,
              },
              {
                slug: "english-quiz/en",
                title: "EN Game",
                views: 99,
              },
            ],
          }),
        );
      }
      return new Response("Not Found", { status: 404 });
    });

    const app = createWorkerApp(buildDependencies());
    const response = await app.fetch(new Request("https://worker.test/api/hot?locale=cn"));
    const payload = (await response.json()) as {
      success: boolean;
      data: HotContentItem[];
    };

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data).toHaveLength(1);
    expect(payload.data[0]?.contentId).toBe("math-quiz/cn");
    expect(payload.data[0]?.locale).toBe("cn");
    expect(payload.data[0]?.contentUrl).toBe("https://www.example.com/math-quiz/cn/");

    mockFetch.mockRestore();
  });

  it("hot 接口命中 KV 数据缓存时不会再 fetch GA4，并会回填 Worker Cache API", async () => {
    const responseCache = createMockResponseCache();
    const apiDataCache = createMockApiDataCache();
    const cacheKeyRequest = buildCanonicalApiGetRequest(
      new Request("https://worker.test/api/hot?locale=en"),
      "/api/hot",
      {
        locale: "en",
      },
    );
    await apiDataCache.primeRequest(cacheKeyRequest, {
      success: true,
      data: [
        {
          hourBucket: "2026-02-27T09:00:00.000Z",
          locale: "en",
          contentId: "cached-game",
          contentTitle: "Cached Game",
          hitCount: 88,
          contentUrl: "https://www.example.com/cached-game/en/",
        },
      ],
    });
    const mockFetch = vi.spyOn(global, "fetch").mockImplementation(async () => {
      throw new Error("不应该执行 fetch");
    });
    const app = createWorkerApp(
      buildDependencies({
        responseCache: responseCache.cache,
        apiDataCache: apiDataCache.cache,
      }),
    );

    const response = await app.fetch(new Request("https://worker.test/api/hot?locale=en"));
    const payload = (await response.json()) as {
      success: boolean;
      data: HotContentItem[];
    };

    expect(response.status).toBe(200);
    expect(payload.data[0]?.contentId).toBe("cached-game");
    expect(mockFetch).not.toHaveBeenCalled();
    expect(responseCache.put).toHaveBeenCalledTimes(1);
    expect(apiDataCache.put).not.toHaveBeenCalled();

    mockFetch.mockRestore();
  });

  it("hot-queries 接口命中 KV 数据缓存时不再查询统计服务", async () => {
    const responseCache = createMockResponseCache();
    const apiDataCache = createMockApiDataCache();
    const queryHourlyHotQueries = vi.fn(async () => [
      {
        hourBucket: "2026-02-27T09:00:00.000Z",
        locale: "en",
        query: "should-not-run",
        hitCount: 1,
      },
    ]);
    const cacheKeyRequest = buildCanonicalApiGetRequest(
      new Request("https://worker.test/api/hot-queries?hours=24&limit=8&locale=en"),
      "/api/hot-queries",
      {
        locale: "en",
      },
    );
    await apiDataCache.primeRequest(cacheKeyRequest, {
      success: true,
      data: [
        {
          hourBucket: "2026-02-27T09:00:00.000Z",
          locale: "en",
          query: "cached-query",
          hitCount: 12,
        },
      ],
    });
    const app = createWorkerApp(
      buildDependencies({
        responseCache: responseCache.cache,
        apiDataCache: apiDataCache.cache,
        queryHourlyHotQueries,
      }),
    );

    const response = await app.fetch(new Request("https://worker.test/api/hot-queries?hours=24&limit=8&locale=en"));
    const payload = (await response.json()) as {
      success: boolean;
      data: Array<{ query: string; hitCount: number }>;
    };

    expect(response.status).toBe(200);
    expect(payload.data[0]?.query).toBe("cached-query");
    expect(queryHourlyHotQueries).not.toHaveBeenCalled();
    expect(responseCache.put).toHaveBeenCalledTimes(1);
    expect(apiDataCache.put).not.toHaveBeenCalled();
  });
});
