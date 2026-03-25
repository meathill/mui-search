import { describe, expect, it } from "vitest";

import { mergeRankedResults } from "../src/ranking/rrf";

describe("mergeRankedResults", () => {
  it("应该融合双路召回并按 RRF 分数排序", () => {
    const keywordMatches = [
      { id: "a", slug: "alpha", title: "A", content: "A-1" },
      { id: "b", title: "B", content: "B-1" },
      { id: "c", title: "C", content: "C-1" },
    ];
    const vectorMatches = [
      { id: "c", title: "C", content: "C-2" },
      { id: "a", title: "A", content: "A-2" },
      { id: "d", title: "D", content: "D-1" },
    ];

    const results = mergeRankedResults(keywordMatches, vectorMatches, 3, {
      keywordWeight: 1,
      vectorWeight: 1,
    });

    expect(results).toHaveLength(3);
    expect(results.map((item) => item.id)).toEqual(["a", "c", "b"]);
    expect(results[0]?.slug).toBe("alpha");
    expect(results[0]?.score).toBeGreaterThan(results[1]?.score ?? 0);
    expect(results[0]?.score).toBeCloseTo(1 / 61 + 1 / 62, 6);
  });

  it("标题前缀命中应优先于仅语义召回结果", () => {
    const keywordMatches = [
      { id: "animal", title: "What Animal Am I?", content: "quiz about your spirit animal" },
      { id: "hero", title: "Which My Hero Academia Character Are You?", content: "popular anime personality quiz" },
    ];
    const vectorMatches = [
      { id: "hero", title: "Which My Hero Academia Character Are You?", content: "popular anime personality quiz" },
    ];

    const results = mergeRankedResults(keywordMatches, vectorMatches, 2, {
      query: "what animal",
      keywordWeight: 1,
      vectorWeight: 1,
    });

    expect(results.map((item) => item.id)).toEqual(["animal", "hero"]);
  });

  it("应该对空输入返回空数组", () => {
    const results = mergeRankedResults([], [], 5);

    expect(results).toEqual([]);
  });
});
