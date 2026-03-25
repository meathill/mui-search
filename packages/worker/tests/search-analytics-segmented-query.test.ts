import { describe, expect, it, vi } from "vitest";

import { createSearchAnalyticsService } from "../src/services/search-analytics";
import { createLoggedDatabase } from "./search-analytics-test-helpers";

describe("createSearchAnalyticsService 分段查询", () => {
  it("分段 Top 搜索词统计应按 hits 排序而不是先按 locale 分组", async () => {
    const detailRows = [
      {
        period_bucket: "2026-02-27",
        locale: "en",
        dimension_value: "iq test",
        hit_count: 4,
      },
      {
        period_bucket: "2026-02-27",
        locale: "zh",
        dimension_value: "how smart are you",
        hit_count: 9,
      },
      {
        period_bucket: "2026-02-27",
        locale: "jp",
        dimension_value: "smart test",
        hit_count: 6,
      },
      {
        period_bucket: "2026-02-26",
        locale: "zh",
        dimension_value: "personality",
        hit_count: 3,
      },
      {
        period_bucket: "2026-02-26",
        locale: "en",
        dimension_value: "iq test",
        hit_count: 2,
      },
    ];
    const { database, callLogs } = createLoggedDatabase((sql) => {
      if (sql.includes("FROM periodic_hot_queries") && sql.includes("GROUP BY query")) {
        return [
          {
            dimension_value: "how smart are you",
            hit_count: 9,
          },
          {
            dimension_value: "iq test",
            hit_count: 6,
          },
          {
            dimension_value: "smart test",
            hit_count: 6,
          },
        ];
      }

      if (sql.includes("FROM periodic_hot_queries")) {
        return detailRows;
      }

      return [];
    });

    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-02-27T10:00:00.000Z"));
    const service = createSearchAnalyticsService(database);
    const stats = await service.querySegmentedTopStats("day", "query", 2, 3, "all");
    nowSpy.mockRestore();

    expect(stats).toEqual({
      granularity: "day",
      dimension: "query",
      periods: 2,
      limit: 3,
      localeFilter: "all",
      locales: ["zh", "en", "jp"],
      summaryRows: [
        {
          dimensionValue: "how smart are you",
          hitCount: 9,
        },
        {
          dimensionValue: "iq test",
          hitCount: 6,
        },
        {
          dimensionValue: "smart test",
          hitCount: 6,
        },
      ],
      rows: [
        {
          periodBucket: "2026-02-27",
          locale: "zh",
          dimensionValue: "how smart are you",
          hitCount: 9,
        },
        {
          periodBucket: "2026-02-27",
          locale: "jp",
          dimensionValue: "smart test",
          hitCount: 6,
        },
        {
          periodBucket: "2026-02-27",
          locale: "en",
          dimensionValue: "iq test",
          hitCount: 4,
        },
        {
          periodBucket: "2026-02-26",
          locale: "zh",
          dimensionValue: "personality",
          hitCount: 3,
        },
        {
          periodBucket: "2026-02-26",
          locale: "en",
          dimensionValue: "iq test",
          hitCount: 2,
        },
      ],
    });

    const segmentedQueryCall = callLogs.find(
      (entry) =>
        entry.kind === "all" &&
        entry.sql.includes("FROM periodic_hot_queries") &&
        !entry.sql.includes("GROUP BY query"),
    );
    expect(segmentedQueryCall).toBeDefined();
    expect(segmentedQueryCall?.params[0]).toBe("day");
    expect(segmentedQueryCall?.params[1]).toBe("2026-02-26");
    expect(segmentedQueryCall?.params[5]).toBe(3);
  });

  it("分段 Top 聚合榜应跨当前时间范围累加 hits", async () => {
    const { database } = createLoggedDatabase((sql) => {
      if (sql.includes("FROM periodic_hot_queries") && sql.includes("GROUP BY query")) {
        return [
          {
            dimension_value: "mbti",
            hit_count: 13,
          },
          {
            dimension_value: "depression",
            hit_count: 3,
          },
        ];
      }

      if (sql.includes("FROM periodic_hot_queries")) {
        return [
          {
            period_bucket: "2026-03-10",
            locale: "en",
            dimension_value: "mbti",
            hit_count: 5,
          },
          {
            period_bucket: "2026-03-09",
            locale: "en",
            dimension_value: "mbti",
            hit_count: 8,
          },
          {
            period_bucket: "2026-03-09",
            locale: "en",
            dimension_value: "depression",
            hit_count: 3,
          },
        ];
      }

      return [];
    });

    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-03-10T10:00:00.000Z"));
    const service = createSearchAnalyticsService(database);
    const stats = await service.querySegmentedTopStats("day", "query", 10, 10, "en");
    nowSpy.mockRestore();

    expect(stats.summaryRows).toEqual([
      {
        dimensionValue: "mbti",
        hitCount: 13,
      },
      {
        dimensionValue: "depression",
        hitCount: 3,
      },
    ]);
  });

  it("按天搜索词分段 Top 明细总数应限制在 100 条以内", async () => {
    const rawRows = createLargeDayQueryRows();
    const { database } = createLoggedDatabase((sql) => {
      if (sql.includes("FROM periodic_hot_queries")) {
        return rawRows;
      }

      return [];
    });

    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-02-27T10:00:00.000Z"));
    const service = createSearchAnalyticsService(database);
    const stats = await service.querySegmentedTopStats("day", "query", 14, 12, "all");
    nowSpy.mockRestore();
    const firstRawRow = rawRows[0];
    const lastRawRow = rawRows[99];

    expect(firstRawRow).toBeDefined();
    expect(lastRawRow).toBeDefined();

    expect(stats.limit).toBe(12);
    expect(stats.localeFilter).toBe("all");
    expect(stats.locales).toEqual(["en", "zh"]);
    expect(stats.summaryRows[0]).toEqual({
      dimensionValue: firstRawRow!.dimension_value,
      hitCount: firstRawRow!.hit_count,
    });
    expect(stats.rows).toHaveLength(100);
    expect(stats.rows[0]).toEqual(toSegmentedTopRow(firstRawRow!));
    expect(stats.rows[99]).toEqual(toSegmentedTopRow(lastRawRow!));
    expect(stats.rows.some((row) => row.dimensionValue === rawRows[100]?.dimension_value)).toBe(false);
  });

  it("分段 Top 目标页面统计应从周期快照表读取并按 locale 过滤", async () => {
    const { database, callLogs } = createLoggedDatabase((sql) => {
      if (sql.includes("FROM periodic_hot_contents") && sql.includes("GROUP BY content_id, content_title")) {
        return [
          {
            content_id: "how-smart-are-you/en",
            dimension_value: "How Smart Are You",
            hit_count: 6,
          },
        ];
      }

      if (sql.includes("FROM periodic_hot_contents")) {
        return [
          {
            period_bucket: "2026-02",
            locale: "en",
            content_id: "how-smart-are-you/en",
            dimension_value: "How Smart Are You",
            hit_count: 6,
          },
        ];
      }

      return [];
    });

    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-02-27T10:00:00.000Z"));
    const service = createSearchAnalyticsService(database);
    const stats = await service.querySegmentedTopStats("month", "content", 2, 5, "en");
    nowSpy.mockRestore();

    expect(stats.dimension).toBe("content");
    expect(stats.localeFilter).toBe("en");
    expect(stats.summaryRows).toEqual([
      {
        contentId: "how-smart-are-you/en",
        dimensionValue: "How Smart Are You",
        hitCount: 6,
      },
    ]);
    expect(stats.rows).toEqual([
      {
        periodBucket: "2026-02",
        locale: "en",
        contentId: "how-smart-are-you/en",
        dimensionValue: "How Smart Are You",
        hitCount: 6,
      },
    ]);
    expect(stats.locales).toEqual(["en"]);

    const segmentedContentCall = callLogs.find(
      (entry) =>
        entry.kind === "all" &&
        entry.sql.includes("FROM periodic_hot_contents") &&
        !entry.sql.includes("GROUP BY content_id, content_title"),
    );
    expect(segmentedContentCall).toBeDefined();
    expect(segmentedContentCall?.params[0]).toBe("month");
    expect(segmentedContentCall?.params[1]).toBe("2026-01");
    expect(segmentedContentCall?.params[2]).toBe("en");
    expect(segmentedContentCall?.params[5]).toBe(5);
  });

  it("分段查询在 UTC 跨日时应按 Asia/Shanghai 计算 day 起始桶", async () => {
    const { database, callLogs } = createLoggedDatabase();
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-02-26T16:30:00.000Z"));

    const service = createSearchAnalyticsService(database);
    await service.querySegmentedTopStats("day", "query", 1, 3, "all");
    nowSpy.mockRestore();

    const segmentedQueryCall = callLogs.find(
      (entry) =>
        entry.kind === "all" &&
        entry.sql.includes("FROM periodic_hot_queries") &&
        !entry.sql.includes("GROUP BY query"),
    );
    expect(segmentedQueryCall).toBeDefined();
    expect(segmentedQueryCall?.params[1]).toBe("2026-02-27");
  });
});

function createLargeDayQueryRows(): Array<{
  period_bucket: string;
  locale: string;
  dimension_value: string;
  hit_count: number;
}> {
  const dayBuckets = ["2026-02-27", "2026-02-26", "2026-02-25", "2026-02-24", "2026-02-23", "2026-02-22"];
  const locales = ["en", "zh"];

  return dayBuckets.flatMap(function byDay(dayBucket, dayIndex) {
    return locales.flatMap(function byLocale(locale, localeIndex) {
      return Array.from({ length: 12 }, function byRank(_, rankIndex) {
        return {
          period_bucket: dayBucket,
          locale,
          dimension_value: `query-${dayBucket}-${locale}-${String(rankIndex + 1).padStart(2, "0")}`,
          hit_count: 1_000 - dayIndex * 40 - localeIndex * 20 - rankIndex,
        };
      });
    });
  });
}

function toSegmentedTopRow(row: { period_bucket: string; locale: string; dimension_value: string; hit_count: number }) {
  return {
    periodBucket: row.period_bucket,
    locale: row.locale,
    dimensionValue: row.dimension_value,
    hitCount: row.hit_count,
  };
}
