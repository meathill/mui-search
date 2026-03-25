import { describe, expect, it } from "vitest";

import { buildHotContentsFromGa4Payload } from "../src/hot-ga4";

describe("buildHotContentsFromGa4Payload", () => {
  it("应从 slug 生成内容 URL，并在缺少 locale 时补齐目标语言", () => {
    const result = buildHotContentsFromGa4Payload(
      {
        updated_at: "2026-03-02T00:00:00.000Z",
        items: [
          {
            slug: "what-animal-am-i",
            title: "What Animal Am I?",
            views: 123,
          },
        ],
      },
      {
        targetLocale: "cn",
        limit: 10,
        contentOrigin: "https://www.example.com",
      },
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      hourBucket: "2026-03-02T00:00:00.000Z",
      locale: "cn",
      contentId: "what-animal-am-i",
      contentTitle: "What Animal Am I?",
      hitCount: 123,
      contentUrl: "https://www.example.com/what-animal-am-i/cn/",
    });
  });

  it("应过滤掉 locale 不匹配的条目", () => {
    const result = buildHotContentsFromGa4Payload(
      {
        updated_at: "2026-03-02T00:00:00.000Z",
        items: [
          {
            slug: "math-quiz/cn",
            title: "CN",
            views: 10,
          },
          {
            slug: "english-quiz/en",
            title: "EN",
            views: 9,
          },
        ],
      },
      {
        targetLocale: "cn",
        limit: 10,
        contentOrigin: "https://www.example.com",
      },
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.contentId).toBe("math-quiz/cn");
  });

  it("应优先使用上游返回的绝对 URL", () => {
    const result = buildHotContentsFromGa4Payload(
      {
        updated_at: "2026-03-02T00:00:00.000Z",
        items: [
          {
            slug: "legacy-path",
            title: "Legacy",
            views: 8,
            url: "https://www.example.com/special/cn/?ref=ga4",
          },
        ],
      },
      {
        targetLocale: "cn",
        limit: 10,
      },
    );

    expect(result[0]?.contentUrl).toBe("https://www.example.com/special/cn/?ref=ga4");
  });
});
