import { describe, expect, it } from "vitest";

import { aggregateSegmentedTopRows, sortSegmentedTopRows } from "@mui-search/shared";

describe("sortSegmentedTopRows", () => {
  it("应先按时间桶倒序，再按 hits 降序，并使用次级字段保持稳定顺序", () => {
    const rows = [
      {
        periodBucket: "2026-02",
        locale: "zh",
        dimensionValue: "B",
        hitCount: 6,
        contentId: "content-b",
      },
      {
        periodBucket: "2026-02-27",
        locale: "en",
        dimensionValue: "iq test",
        hitCount: 4,
      },
      {
        periodBucket: "2026-02-27",
        locale: "zh",
        dimensionValue: "how smart are you",
        hitCount: 9,
      },
      {
        periodBucket: "2026-02",
        locale: "en",
        dimensionValue: "A",
        hitCount: 6,
        contentId: "content-a",
      },
      {
        periodBucket: "2026-02-27",
        locale: "jp",
        dimensionValue: "smart test",
        hitCount: 6,
      },
      {
        periodBucket: "2026-02",
        locale: "en",
        dimensionValue: "A",
        hitCount: 6,
        contentId: "content-z",
      },
    ];

    expect(sortSegmentedTopRows(rows)).toEqual([
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
        periodBucket: "2026-02",
        locale: "en",
        dimensionValue: "A",
        hitCount: 6,
        contentId: "content-a",
      },
      {
        periodBucket: "2026-02",
        locale: "en",
        dimensionValue: "A",
        hitCount: 6,
        contentId: "content-z",
      },
      {
        periodBucket: "2026-02",
        locale: "zh",
        dimensionValue: "B",
        hitCount: 6,
        contentId: "content-b",
      },
    ]);
  });

  it("应能按当前范围聚合热词总 hits", () => {
    const rows = [
      {
        periodBucket: "2026-03-10",
        locale: "en",
        dimensionValue: "mbti",
        hitCount: 5,
      },
      {
        periodBucket: "2026-03-09",
        locale: "en",
        dimensionValue: "mbti",
        hitCount: 8,
      },
      {
        periodBucket: "2026-03-09",
        locale: "en",
        dimensionValue: "depression",
        hitCount: 3,
      },
    ];

    expect(aggregateSegmentedTopRows(rows, "query")).toEqual([
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
});
