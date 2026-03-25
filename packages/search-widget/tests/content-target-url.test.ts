import { describe, expect, it } from "vitest";

import { buildContentTargetUrl, normalizeSiteUrl } from "../src/content-target-url";

describe("content-target-url", () => {
  it("应优先使用显式绝对 URL", () => {
    const result = buildContentTargetUrl({
      siteUrl: "https://www.example.com",
      slugOrPath: "what-animal-am-i",
      locale: "en",
      explicitUrl: "https://www.example.com/special/en/?ref=hot",
    });

    expect(result).toBe("https://www.example.com/special/en/?ref=hot");
  });

  it("应按 {SITE_URL}/{slug}/{locale}/ 生成 URL", () => {
    const result = buildContentTargetUrl({
      siteUrl: "https://www.example.com",
      slugOrPath: "what-animal-am-i",
      locale: "en",
    });

    expect(result).toBe("https://www.example.com/what-animal-am-i/en/");
  });

  it("slug 已包含 locale 时不应重复追加", () => {
    const result = buildContentTargetUrl({
      siteUrl: "https://www.example.com",
      slugOrPath: "math-quiz/cn",
      locale: "en",
    });

    expect(result).toBe("https://www.example.com/math-quiz/cn/");
  });

  it("slugOrPath 为绝对 URL 时应提取其路径", () => {
    const result = buildContentTargetUrl({
      siteUrl: "https://www.example.com",
      slugOrPath: "https://hub.example.com/path/to/game?foo=1#hash",
      locale: "zh",
    });

    expect(result).toBe("https://www.example.com/path/to/game/zh/");
  });

  it("显式绝对 URL 应保留原查询参数和 hash", () => {
    const result = buildContentTargetUrl({
      siteUrl: "https://www.example.com",
      explicitUrl: "https://www.example.com/special/en/?ref=hot#title",
    });

    expect(result).toBe("https://www.example.com/special/en/?ref=hot#title");
  });

  it("normalizeSiteUrl 应清理多余尾斜杠", () => {
    const result = normalizeSiteUrl("https://www.example.com///");

    expect(result).toBe("https://www.example.com");
  });
});
