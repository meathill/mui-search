import { describe, expect, it } from "vitest";

import { aggregateHotContents } from "../src/hot-contents";

describe("aggregateHotContents", () => {
  it("应按 contentId+locale 聚合并按 hitCount 降序", () => {
    const result = aggregateHotContents(
      [
        {
          hourBucket: "2026-02-28T09:00:00.000Z",
          locale: "en",
          contentId: "1",
          contentTitle: "What Animal Am I?",
          hitCount: 3,
          contentUrl: "https://www.example.com/what-animal-am-i/en/",
        },
        {
          hourBucket: "2026-02-28T10:00:00.000Z",
          locale: "en",
          contentId: "1",
          contentTitle: "What Animal Am I?",
          hitCount: 5,
        },
        {
          hourBucket: "2026-02-28T10:00:00.000Z",
          locale: "zh",
          contentId: "2",
          contentTitle: "你是哪种动物？",
          hitCount: 6,
        },
      ],
      10,
    );

    expect(result).toEqual([
      {
        contentId: "1",
        contentTitle: "What Animal Am I?",
        locale: "en",
        hitCount: 8,
        contentUrl: "https://www.example.com/what-animal-am-i/en/",
      },
      {
        contentId: "2",
        contentTitle: "你是哪种动物？",
        locale: "zh",
        hitCount: 6,
      },
    ]);
  });

  it("应按 limit 截断", () => {
    const result = aggregateHotContents(
      [
        {
          hourBucket: "2026-02-28T10:00:00.000Z",
          locale: "en",
          contentId: "1",
          contentTitle: "A",
          hitCount: 8,
        },
        {
          hourBucket: "2026-02-28T10:00:00.000Z",
          locale: "en",
          contentId: "2",
          contentTitle: "B",
          hitCount: 7,
        },
      ],
      1,
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.contentId).toBe("1");
  });
});
