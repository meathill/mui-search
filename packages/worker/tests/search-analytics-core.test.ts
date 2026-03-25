import { describe, expect, it, vi } from "vitest";

import { createSearchAnalyticsService } from "../src/services/search-analytics";
import { createLoggedDatabase } from "./search-analytics-test-helpers";

describe("createSearchAnalyticsService 基础能力", () => {
  it("未配置 D1 时保持无副作用", async () => {
    const service = createSearchAnalyticsService(undefined);

    await expect(
      service.recordSearch({
        query: "how",
        locale: "en",
        resultCount: 1,
      }),
    ).resolves.toBeUndefined();

    await expect(
      service.recordClick({
        query: "how",
        locale: "en",
        contentId: "101",
        contentTitle: "How Smart Are You",
        contentLocale: "en",
      }),
    ).resolves.toBeUndefined();

    await expect(
      service.refreshHourlyHotContentsSnapshot({
        now: new Date("2026-02-27T09:15:00.000Z"),
      }),
    ).resolves.toBeUndefined();
    await expect(
      service.refreshSegmentedTopSnapshot({
        now: new Date("2026-02-27T09:15:00.000Z"),
      }),
    ).resolves.toBeUndefined();

    await expect(service.queryHourlyHotContents(24, 10, "en")).resolves.toEqual([]);
    await expect(service.queryDailySearchStats(7, "en")).resolves.toEqual({
      days: expect.any(Array),
      locales: [],
      searchUsersEstimateBasis: "distinct_query",
    });
    await expect(service.querySegmentedTopStats("week", "content", 8, 5, "en")).resolves.toEqual({
      granularity: "week",
      dimension: "content",
      periods: 8,
      limit: 5,
      localeFilter: "en",
      locales: [],
      summaryRows: [],
      rows: [],
    });
  });

  it("点击只写流水，定时任务负责刷新热榜快照", async () => {
    const { database, callLogs } = createLoggedDatabase((sql) => {
      if (sql.includes("FROM click_history") || sql.includes("FROM hourly_hot_contents")) {
        return [
          {
            hour_bucket: "2026-02-27T09:00:00.000Z",
            locale: "en",
            content_id: "101",
            content_title: "How Smart Are You",
            hit_count: 5,
          },
        ];
      }

      return [];
    });

    const service = createSearchAnalyticsService(database);

    await service.recordSearch({
      query: "how",
      locale: "all",
      resultCount: 3,
    });

    await service.recordClick({
      query: "how",
      locale: "all",
      contentId: "101",
      contentTitle: "How Smart Are You",
      contentLocale: "en",
    });

    const hotUpsertAfterClick = callLogs.find((entry) => entry.sql.includes("INSERT INTO hourly_hot_contents"));
    expect(hotUpsertAfterClick).toBeUndefined();

    await service.refreshHourlyHotContentsSnapshot({
      now: new Date("2026-02-27T09:15:00.000Z"),
      lookbackHours: 24,
      retentionHours: 72,
    });

    const hot = await service.queryHourlyHotContents(24, 5, "en");

    expect(hot).toEqual([
      {
        hourBucket: "2026-02-27T09:00:00.000Z",
        locale: "en",
        contentId: "101",
        contentTitle: "How Smart Are You",
        hitCount: 5,
      },
    ]);

    const historyInsertCall = callLogs.find((entry) => entry.sql.includes("INSERT INTO search_history"));
    const clickInsertCall = callLogs.find((entry) => entry.sql.includes("INSERT INTO click_history"));
    const refreshDeleteCall = callLogs.find((entry) =>
      entry.sql.includes("DELETE FROM hourly_hot_contents WHERE hour_bucket >="),
    );
    const refreshInsertCall = callLogs.find(
      (entry) => entry.sql.includes("SELECT") && entry.sql.includes("FROM click_history"),
    );
    const retentionDeleteCall = callLogs.find((entry) =>
      entry.sql.includes("DELETE FROM click_history WHERE hour_bucket <"),
    );
    const hotSelectCall = callLogs.find(
      (entry) => entry.kind === "all" && entry.sql.includes("FROM hourly_hot_contents"),
    );
    const runtimeCreateTableCall = callLogs.find((entry) => entry.sql.includes("CREATE TABLE"));

    expect(historyInsertCall).toBeDefined();
    expect(clickInsertCall).toBeDefined();
    expect(refreshDeleteCall).toBeDefined();
    expect(refreshInsertCall).toBeDefined();
    expect(retentionDeleteCall).toBeDefined();
    expect(hotSelectCall).toBeDefined();
    expect(runtimeCreateTableCall).toBeUndefined();
  });

  it("按天统计应返回每日搜索量、估算人数与语言分布", async () => {
    const { database, callLogs } = createLoggedDatabase((sql) => {
      if (sql.includes("COUNT(DISTINCT lower(trim(query)))")) {
        return [
          {
            day_bucket: "2026-02-26",
            search_count: 12,
            search_users_estimate: 7,
          },
          {
            day_bucket: "2026-02-27",
            search_count: 8,
            search_users_estimate: 6,
          },
        ];
      }

      if (sql.includes("GROUP BY day_bucket, locale")) {
        return [
          {
            day_bucket: "2026-02-26",
            locale: "en",
            search_count: 5,
          },
          {
            day_bucket: "2026-02-26",
            locale: "zh",
            search_count: 7,
          },
          {
            day_bucket: "2026-02-27",
            locale: "zh",
            search_count: 8,
          },
        ];
      }

      return [];
    });

    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-02-27T10:00:00.000Z"));
    const service = createSearchAnalyticsService(database);
    const stats = await service.queryDailySearchStats(3, "all");
    nowSpy.mockRestore();

    expect(stats.searchUsersEstimateBasis).toBe("distinct_query");
    expect(stats.locales).toEqual(["zh", "en"]);
    expect(stats.days).toEqual([
      {
        day: "2026-02-25",
        searchCount: 0,
        searchUsersEstimate: 0,
        localeBreakdown: {},
      },
      {
        day: "2026-02-26",
        searchCount: 12,
        searchUsersEstimate: 7,
        localeBreakdown: {
          en: 5,
          zh: 7,
        },
      },
      {
        day: "2026-02-27",
        searchCount: 8,
        searchUsersEstimate: 6,
        localeBreakdown: {
          zh: 8,
        },
      },
    ]);

    const dailyStatsQueryCall = callLogs.find(
      (entry) => entry.kind === "all" && entry.sql.includes("COUNT(DISTINCT lower(trim(query)))"),
    );
    expect(dailyStatsQueryCall).toBeDefined();
    expect(dailyStatsQueryCall?.params[1]).toBe("all");
  });

  it("按天统计在 UTC 跨日时应按 Asia/Shanghai 分桶", async () => {
    const { database, callLogs } = createLoggedDatabase((sql) => {
      if (sql.includes("COUNT(DISTINCT lower(trim(query)))")) {
        return [
          {
            day_bucket: "2026-02-27",
            search_count: 3,
            search_users_estimate: 2,
          },
        ];
      }

      if (sql.includes("GROUP BY day_bucket, locale")) {
        return [
          {
            day_bucket: "2026-02-27",
            locale: "zh",
            search_count: 3,
          },
        ];
      }

      return [];
    });

    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-02-26T16:30:00.000Z"));
    const service = createSearchAnalyticsService(database);
    const stats = await service.queryDailySearchStats(2, "all");
    nowSpy.mockRestore();

    expect(stats.days).toEqual([
      {
        day: "2026-02-26",
        searchCount: 0,
        searchUsersEstimate: 0,
        localeBreakdown: {},
      },
      {
        day: "2026-02-27",
        searchCount: 3,
        searchUsersEstimate: 2,
        localeBreakdown: {
          zh: 3,
        },
      },
    ]);

    const dailyStatsQueryCall = callLogs.find(
      (entry) => entry.kind === "all" && entry.sql.includes("COUNT(DISTINCT lower(trim(query)))"),
    );
    expect(dailyStatsQueryCall?.sql.includes("date(requested_at, '+8 hours')")).toBe(true);
  });

  it("小时热搜词计算应该忽略大小写和首尾空格", async () => {
    const { database, callLogs } = createLoggedDatabase();
    const service = createSearchAnalyticsService(database);

    await service.refreshHourlyHotContentsSnapshot({
      now: new Date("2026-02-27T09:15:00.000Z"),
    });

    const hourlyQueriesInsertCall = callLogs.find(
      (entry) => entry.sql.includes("INSERT INTO hourly_hot_queries") && entry.sql.includes("lower(trim(sh.query))"),
    );
    expect(hourlyQueriesInsertCall).toBeDefined();

    // 也验证 GROUP BY 没有别名遮蔽问题
    expect(hourlyQueriesInsertCall?.sql.includes("GROUP BY sh.hour_bucket, sh.locale, lower(trim(sh.query))")).toBe(
      true,
    );
  });
});
