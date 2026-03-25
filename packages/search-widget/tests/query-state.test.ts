import { describe, expect, it } from "vitest";

import { buildRelativeUrlWithQueryState, readQueryStateFromUrl } from "../src/query-state";

describe("search-widget query state", () => {
  it("应从 URL 读取 suggestQuery 与 searchQuery", () => {
    const state = readQueryStateFromUrl("https://example.com/?suggestQuery=how&searchQuery=how+smart#hash");

    expect(state.suggestQuery).toBe("how");
    expect(state.searchQuery).toBe("how smart");
  });

  it("应回写并清理 URL 查询参数", () => {
    const url = buildRelativeUrlWithQueryState("https://example.com/path?foo=1#hash", {
      suggestQuery: "what",
      searchQuery: "",
    });

    expect(url).toBe("/path?foo=1&suggestQuery=what#hash");
  });
});
