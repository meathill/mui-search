import { describe, expect, it } from "vitest";

import { resolveDefaultSiteUrl } from "../src/constants";

describe("search-widget constants", () => {
  it("未提供环境变量时应回退到默认站点", () => {
    const result = resolveDefaultSiteUrl(undefined);

    expect(result).toBe("");
  });

  it("应规范化合法站点地址并移除尾部斜杠", () => {
    const result = resolveDefaultSiteUrl(" https://quiz.example.com/path/// ");

    expect(result).toBe("https://quiz.example.com/path");
  });

  it("环境变量非法时应回退到默认站点", () => {
    const result = resolveDefaultSiteUrl("not-a-valid-url");

    expect(result).toBe("");
  });
});
