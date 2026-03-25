import { describe, expect, it } from "vitest";

import { createSearchAnalyticsService } from "../src/services/search-analytics";
import { createLoggedDatabase } from "./search-analytics-test-helpers";

describe("createSearchAnalyticsService 分段刷新", () => {
  it("仅日粒度刷新应重算当天词频并避免周月聚合", async () => {
    const { database, callLogs } = createLoggedDatabase();
    const service = createSearchAnalyticsService(database);

    await service.refreshSegmentedTopDaySnapshot({
      now: new Date("2026-03-05T10:20:00.000Z"),
      dayRefreshLookbackDays: 1,
      dayRetentionDays: 10,
    });

    expect(
      callLogs.some(
        (entry) =>
          entry.sql.includes("DELETE FROM periodic_hot_queries WHERE granularity = ? AND period_bucket >= ?") &&
          entry.params[0] === "day" &&
          entry.params[1] === "2026-03-05",
      ),
    ).toBe(true);
    expect(
      callLogs.some(
        (entry) =>
          entry.sql.includes("DELETE FROM periodic_hot_contents WHERE granularity = ? AND period_bucket >= ?") &&
          entry.params[0] === "day" &&
          entry.params[1] === "2026-03-05",
      ),
    ).toBe(true);

    expect(callLogs.some((entry) => entry.sql.includes("FROM periodic_hot_queries day_stats"))).toBe(false);
    expect(callLogs.some((entry) => entry.sql.includes("FROM periodic_hot_contents day_stats"))).toBe(false);
  });

  it("分段 Top 快照刷新应按日周月重算并执行保留清理", async () => {
    const { database, callLogs } = createLoggedDatabase();
    const service = createSearchAnalyticsService(database);

    await service.refreshSegmentedTopSnapshot({
      now: new Date("2026-03-05T00:20:00.000Z"),
      dayRefreshLookbackDays: 3,
      dayRetentionDays: 10,
      weekRetentionWeeks: 4,
      monthRetentionMonths: 2,
    });

    expect(
      callLogs.some(
        (entry) =>
          entry.sql.includes("DELETE FROM periodic_hot_queries WHERE granularity = ? AND period_bucket >= ?") &&
          entry.params[0] === "day" &&
          entry.params[1] === "2026-03-03",
      ),
    ).toBe(true);
    expect(
      callLogs.some(
        (entry) =>
          entry.sql.includes("DELETE FROM periodic_hot_queries WHERE granularity = ? AND period_bucket >= ?") &&
          entry.params[0] === "week" &&
          entry.params[1] === "2026-03-02",
      ),
    ).toBe(true);
    expect(
      callLogs.some(
        (entry) =>
          entry.sql.includes("DELETE FROM periodic_hot_queries WHERE granularity = ? AND period_bucket >= ?") &&
          entry.params[0] === "month" &&
          entry.params[1] === "2026-03",
      ),
    ).toBe(true);

    expect(
      callLogs.some(
        (entry) => entry.sql.includes("FROM periodic_hot_queries day_stats") && entry.params[1] === "2026-03-02",
      ),
    ).toBe(true);
    expect(
      callLogs.some(
        (entry) => entry.sql.includes("strftime('%Y-%m', day_stats.period_bucket)") && entry.params[1] === "2026-03",
      ),
    ).toBe(true);

    expect(
      callLogs.some(
        (entry) =>
          entry.sql.includes("DELETE FROM periodic_hot_queries WHERE granularity = ? AND period_bucket < ?") &&
          entry.params[0] === "day" &&
          entry.params[1] === "2026-02-24",
      ),
    ).toBe(true);
    expect(
      callLogs.some(
        (entry) =>
          entry.sql.includes("DELETE FROM periodic_hot_queries WHERE granularity = ? AND period_bucket < ?") &&
          entry.params[0] === "week" &&
          entry.params[1] === "2026-02-09",
      ),
    ).toBe(true);
    expect(
      callLogs.some(
        (entry) =>
          entry.sql.includes("DELETE FROM periodic_hot_queries WHERE granularity = ? AND period_bucket < ?") &&
          entry.params[0] === "month" &&
          entry.params[1] === "2026-02",
      ),
    ).toBe(true);

    expect(
      callLogs.some(
        (entry) =>
          entry.sql.includes("DELETE FROM periodic_hot_contents WHERE granularity = ? AND period_bucket >= ?") &&
          entry.params[0] === "week" &&
          entry.params[1] === "2026-03-02",
      ),
    ).toBe(true);
    expect(
      callLogs.some(
        (entry) =>
          entry.sql.includes("DELETE FROM periodic_hot_contents WHERE granularity = ? AND period_bucket < ?") &&
          entry.params[0] === "month" &&
          entry.params[1] === "2026-02",
      ),
    ).toBe(true);
  });

  it("分段刷新在 UTC 跨日时应按 Asia/Shanghai 计算当天桶", async () => {
    const { database, callLogs } = createLoggedDatabase();
    const service = createSearchAnalyticsService(database);

    await service.refreshSegmentedTopDaySnapshot({
      now: new Date("2026-03-04T16:30:00.000Z"),
      dayRefreshLookbackDays: 1,
      dayRetentionDays: 1,
    });

    expect(
      callLogs.some(
        (entry) =>
          entry.sql.includes("DELETE FROM periodic_hot_queries WHERE granularity = ? AND period_bucket >= ?") &&
          entry.params[0] === "day" &&
          entry.params[1] === "2026-03-05",
      ),
    ).toBe(true);
    expect(
      callLogs.some(
        (entry) =>
          entry.sql.includes("INSERT INTO periodic_hot_queries") &&
          entry.sql.includes("date(sh.requested_at, '+8 hours') AS period_bucket"),
      ),
    ).toBe(true);
  });

  it("分段热搜词查询插入时应该忽略大小写和首尾空格以防唯一索引冲突", async () => {
    const { database, callLogs } = createLoggedDatabase();
    const service = createSearchAnalyticsService(database);

    await service.refreshSegmentedTopDaySnapshot({
      now: new Date("2026-03-05T10:20:00.000Z"),
    });

    const dayQueriesInsertCall = callLogs.find(
      (entry) => entry.sql.includes("INSERT INTO periodic_hot_queries") && entry.sql.includes("lower(trim(sh.query))"),
    );
    expect(dayQueriesInsertCall).toBeDefined();

    // 验证 GROUP BY 没有别名遮蔽问题
    expect(dayQueriesInsertCall?.sql.includes("GROUP BY period_bucket, sh.locale, lower(trim(sh.query))")).toBe(true);
  });
});
