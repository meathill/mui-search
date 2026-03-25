import { describe, expect, it } from "vitest";

import { activateFilteredStatsScope, buildSegmentedTopRequest, createDefaultStatsState } from "../src/stats-state";

describe("stats-state", () => {
  it("整页首屏默认只显示今天数据", () => {
    const state = createDefaultStatsState();

    expect(state.dailyDays).toBe(1);
    expect(state.filteredDailyDays).toBe(14);
    expect(state.statsScope).toBe("today");
    expect(buildSegmentedTopRequest(state)).toEqual({
      granularity: "day",
      dimension: "query",
      periods: 1,
      limit: 100,
      locale: "all",
    });
  });

  it("用户改 filter 后应切回当前筛选范围聚合", () => {
    const state = createDefaultStatsState();
    activateFilteredStatsScope(state);
    state.topGranularity = "week";
    state.topDimension = "content";
    state.locale = "en";

    expect(state.dailyDays).toBe(14);
    expect(state.statsScope).toBe("filtered");
    expect(buildSegmentedTopRequest(state)).toEqual({
      granularity: "week",
      dimension: "content",
      periods: 2,
      limit: 100,
      locale: "en",
    });
  });

  it("今天态下修改 dailyDays 后应保留用户输入作为聚合范围", () => {
    const state = createDefaultStatsState();
    state.dailyDays = 30;
    state.filteredDailyDays = 30;
    state.statsScope = "filtered";

    expect(buildSegmentedTopRequest(state)).toEqual({
      granularity: "day",
      dimension: "query",
      periods: 30,
      limit: 100,
      locale: "all",
    });
  });
});
