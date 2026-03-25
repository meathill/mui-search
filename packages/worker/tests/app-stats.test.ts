import { describe, expect, it, vi } from "vitest";

import type { DailySearchStats, SegmentedTopStats } from "@mui-search/shared";
import { createWorkerApp } from "../src/app";
import { buildCanonicalApiGetRequest } from "../src/response-cache";
import { buildDependencies, createMockApiDataCache, createMockResponseCache } from "./app-test-helpers";

describe("createWorkerApp stats 接口", () => {
  it("daily-search stats 接口应返回按天统计并传递查询参数", async () => {
    const queryDailySearchStats = vi.fn(async () => ({
      days: [
        {
          day: "2026-02-27",
          searchCount: 11,
          searchUsersEstimate: 8,
          localeBreakdown: {
            en: 5,
            zh: 6,
          },
        },
      ],
      locales: ["zh", "en"],
      searchUsersEstimateBasis: "distinct_query" as const,
    }));
    const app = createWorkerApp(
      buildDependencies({
        queryDailySearchStats,
      }),
    );

    const response = await app.fetch(new Request("https://worker.test/api/stats/daily-search?days=30&locale=en"));
    const payload = (await response.json()) as {
      success: boolean;
      data: DailySearchStats;
    };

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("public, max-age=300");
    expect(payload.success).toBe(true);
    expect(payload.data.days).toHaveLength(1);
    expect(payload.data.days[0]?.day).toBe("2026-02-27");
    expect(queryDailySearchStats).toHaveBeenCalledWith(30, "en");
  });

  it("daily-search stats 接口对非法 locale 返回 400", async () => {
    const app = createWorkerApp(buildDependencies());

    const response = await app.fetch(new Request("https://worker.test/api/stats/daily-search?locale=zh_cn"));
    const payload = (await response.json()) as {
      success: boolean;
      message: string;
    };

    expect(response.status).toBe(400);
    expect(payload.success).toBe(false);
    expect(payload.message).toContain("参数格式错误");
  });

  it("daily-search stats 接口命中 KV 数据缓存时不再查询统计服务", async () => {
    const responseCache = createMockResponseCache();
    const apiDataCache = createMockApiDataCache();
    const queryDailySearchStats = vi.fn(async () => ({
      days: [],
      locales: [],
      searchUsersEstimateBasis: "distinct_query" as const,
    }));
    const cacheKeyRequest = buildCanonicalApiGetRequest(
      new Request("https://worker.test/api/stats/daily-search?days=30&locale=en"),
      "/api/stats/daily-search",
      {
        days: 30,
        locale: "en",
      },
    );
    await apiDataCache.primeRequest(cacheKeyRequest, {
      success: true,
      data: {
        days: [
          {
            day: "2026-02-27",
            searchCount: 18,
            searchUsersEstimate: 9,
            localeBreakdown: {
              en: 18,
            },
          },
        ],
        locales: ["en"],
        searchUsersEstimateBasis: "distinct_query",
      },
    });
    const app = createWorkerApp(
      buildDependencies({
        responseCache: responseCache.cache,
        apiDataCache: apiDataCache.cache,
        queryDailySearchStats,
      }),
    );

    const response = await app.fetch(new Request("https://worker.test/api/stats/daily-search?days=30&locale=en"));
    const payload = (await response.json()) as {
      success: boolean;
      data: DailySearchStats;
    };

    expect(response.status).toBe(200);
    expect(payload.data.days[0]?.searchCount).toBe(18);
    expect(queryDailySearchStats).not.toHaveBeenCalled();
    expect(responseCache.put).toHaveBeenCalledTimes(1);
    expect(apiDataCache.put).not.toHaveBeenCalled();
  });

  it("segmented-top stats 接口应返回分段 Top 数据并透传参数", async () => {
    const querySegmentedTopStats = vi.fn(async () => ({
      granularity: "week" as const,
      dimension: "content" as const,
      periods: 8,
      limit: 5,
      localeFilter: "en",
      locales: ["en", "zh"],
      summaryRows: [
        {
          contentId: "101",
          dimensionValue: "How Smart Are You",
          hitCount: 6,
        },
      ],
      rows: [
        {
          periodBucket: "2026-02-23",
          locale: "en",
          contentId: "101",
          dimensionValue: "How Smart Are You",
          hitCount: 6,
        },
      ],
    }));
    const app = createWorkerApp(
      buildDependencies({
        querySegmentedTopStats,
      }),
    );

    const response = await app.fetch(
      new Request(
        "https://worker.test/api/stats/segmented-top?granularity=week&dimension=content&periods=8&limit=5&locale=en",
      ),
    );
    const payload = (await response.json()) as {
      success: boolean;
      data: SegmentedTopStats;
    };

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("public, max-age=300");
    expect(payload.success).toBe(true);
    expect(payload.data.dimension).toBe("content");
    expect(payload.data.localeFilter).toBe("en");
    expect(payload.data.summaryRows[0]?.hitCount).toBe(6);
    expect(payload.data.rows[0]?.contentId).toBe("101");
    expect(querySegmentedTopStats).toHaveBeenCalledWith("week", "content", 8, 5, "en");
  });

  it("segmented-top stats 接口对非法 granularity 返回 400", async () => {
    const app = createWorkerApp(buildDependencies());

    const response = await app.fetch(new Request("https://worker.test/api/stats/segmented-top?granularity=year"));
    const payload = (await response.json()) as {
      success: boolean;
      message: string;
    };

    expect(response.status).toBe(400);
    expect(payload.success).toBe(false);
    expect(payload.message).toContain("granularity");
  });

  it("segmented-top stats 接口命中 KV 数据缓存时不再查询统计服务", async () => {
    const responseCache = createMockResponseCache();
    const apiDataCache = createMockApiDataCache();
    const querySegmentedTopStats = vi.fn(async () => ({
      granularity: "week" as const,
      dimension: "content" as const,
      periods: 8,
      limit: 5,
      localeFilter: "en",
      locales: ["en"],
      summaryRows: [],
      rows: [],
    }));
    const cacheKeyRequest = buildCanonicalApiGetRequest(
      new Request(
        "https://worker.test/api/stats/segmented-top?granularity=week&dimension=content&periods=8&limit=5&locale=en",
      ),
      "/api/stats/segmented-top",
      {
        granularity: "week",
        dimension: "content",
        periods: 8,
        limit: 5,
        locale: "en",
      },
    );
    await apiDataCache.primeRequest(cacheKeyRequest, {
      success: true,
      data: {
        granularity: "week",
        dimension: "content",
        periods: 8,
        limit: 5,
        localeFilter: "en",
        locales: ["en"],
        summaryRows: [
          {
            contentId: "cached-101",
            dimensionValue: "Cached Content",
            hitCount: 10,
          },
        ],
        rows: [
          {
            periodBucket: "2026-02-23",
            locale: "en",
            contentId: "cached-101",
            dimensionValue: "Cached Content",
            hitCount: 10,
          },
        ],
      },
    });
    const app = createWorkerApp(
      buildDependencies({
        responseCache: responseCache.cache,
        apiDataCache: apiDataCache.cache,
        querySegmentedTopStats,
      }),
    );

    const response = await app.fetch(
      new Request(
        "https://worker.test/api/stats/segmented-top?granularity=week&dimension=content&periods=8&limit=5&locale=en",
      ),
    );
    const payload = (await response.json()) as {
      success: boolean;
      data: SegmentedTopStats;
    };

    expect(response.status).toBe(200);
    expect(payload.data.summaryRows[0]?.contentId).toBe("cached-101");
    expect(querySegmentedTopStats).not.toHaveBeenCalled();
    expect(responseCache.put).toHaveBeenCalledTimes(1);
    expect(apiDataCache.put).not.toHaveBeenCalled();
  });
});
