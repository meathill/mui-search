import { describe, expect, it } from "vitest";

import { buildRelativeUrlWithQueryState, readQueryStateFromUrl } from "../src/url-query-state";

describe("url-query-state", () => {
  it("应从 URL 正确读取 suggestQuery/searchQuery", () => {
    const result = readQueryStateFromUrl("https://example.com/?suggestQuery=how&searchQuery=what+animal");

    expect(result).toEqual({
      suggestQuery: "how",
      searchQuery: "what animal",
    });
  });

  it("应生成包含查询参数的相对路径并保留 hash", () => {
    const result = buildRelativeUrlWithQueryState("https://example.com/playground?foo=1#demo", {
      suggestQuery: "how",
      searchQuery: "what animal",
    });

    expect(result).toBe("/playground?foo=1&suggestQuery=how&searchQuery=what+animal#demo");
  });

  it("当查询值为空时应删除对应参数", () => {
    const result = buildRelativeUrlWithQueryState("https://example.com/?suggestQuery=how&searchQuery=what", {
      suggestQuery: " ",
      searchQuery: "",
    });

    expect(result).toBe("/");
  });
});
