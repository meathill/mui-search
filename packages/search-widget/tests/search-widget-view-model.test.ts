import { describe, expect, it } from "vitest";

import { calculateSuggestionRenderedCount, resolveContentPanelMode } from "../src/search-widget-view-model";

describe("search-widget-view-model", () => {
  it("query 为空时应展示热搜面板", () => {
    expect(resolveContentPanelMode("", "")).toBe("hot");
    expect(resolveContentPanelMode("   ", "abc")).toBe("hot");
  });

  it("query 与最近一次搜索词一致时应展示搜索结果面板", () => {
    expect(resolveContentPanelMode("cat", "cat")).toBe("search");
    expect(resolveContentPanelMode(" cat ", "cat  ")).toBe("search");
  });

  it("query 非空且未触发同词搜索时应展示 suggestion 面板", () => {
    expect(resolveContentPanelMode("cat", "")).toBe("suggestion");
    expect(resolveContentPanelMode("cat", "dog")).toBe("suggestion");
  });

  it("应按建议列表和 loading 状态计算已渲染行数", () => {
    expect(calculateSuggestionRenderedCount({ suggestionCount: 3, isSuggestLoading: false })).toBe(3);
    expect(calculateSuggestionRenderedCount({ suggestionCount: 3, isSuggestLoading: true })).toBe(3);
    expect(calculateSuggestionRenderedCount({ suggestionCount: 0, isSuggestLoading: true })).toBe(0);
    expect(calculateSuggestionRenderedCount({ suggestionCount: 0, isSuggestLoading: false })).toBe(1);
  });
});
