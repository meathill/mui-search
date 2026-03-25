import { describe, expect, it, vi } from "vitest";

import { createSearchApi } from "../src/search-api";

describe("createSearchApi", () => {
  it("suggest 请求应拼装 query/limit/locale 参数", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      expect(url).toContain("/api/suggest");
      expect(url).toContain("q=what+animal");
      expect(url).toContain("limit=8");
      expect(url).toContain("locale=en");

      return new Response(
        JSON.stringify({
          success: true,
          suggestions: [
            {
              id: "1",
              text: "What Animal Am I?",
            },
          ],
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        },
      );
    });

    const api = createSearchApi({
      apiBaseUrl: "https://worker.example.workers.dev",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    const result = await api.suggest({
      query: "what animal",
      limit: 8,
      locale: "en",
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.text).toBe("What Animal Am I?");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("search 请求应使用 GET 并拼装参数", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.method).toBe("GET");
      const url = String(input);
      expect(url).toContain("/api/search");
      expect(url).toContain("q=how");
      expect(url).toContain("limit=10");
      expect(url).toContain("locale=all");

      return new Response(
        JSON.stringify({
          success: true,
          data: [
            {
              id: "2",
              title: "How Smart Are You",
              content: "test",
              score: 0.61,
              locale: "en",
            },
          ],
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        },
      );
    });

    const api = createSearchApi({
      apiBaseUrl: "https://worker.example.workers.dev",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    const result = await api.search({
      query: "how",
      limit: 10,
      locale: "all",
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("2");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("search 关键词长度不足时应在前端直接拦截", async () => {
    const fetchMock = vi.fn();
    const api = createSearchApi({
      apiBaseUrl: "https://worker.example.workers.dev",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    await expect(
      api.search({
        query: "a",
        limit: 10,
        locale: "all",
      }),
    ).rejects.toThrow("关键词长度不足");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("hot 请求应拼装 locale/limit/hours 参数", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.method).toBe("GET");
      const url = String(input);
      expect(url).toContain("/api/hot");
      expect(url).toContain("locale=zh");
      expect(url).toContain("limit=6");
      expect(url).toContain("hours=12");

      return new Response(
        JSON.stringify({
          success: true,
          data: [
            {
              hourBucket: "2026-02-28T10:00:00.000Z",
              locale: "zh",
              contentId: "101",
              contentTitle: "What Animal Am I?",
              hitCount: 12,
            },
          ],
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        },
      );
    });

    const api = createSearchApi({
      apiBaseUrl: "https://worker.example.workers.dev",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    const result = await api.hot({
      locale: "zh",
      limit: 6,
      hours: 12,
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.contentId).toBe("101");
  });

  it("trackClick 在服务端失败时应抛错", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response("forbidden", {
        status: 403,
        headers: {
          "content-type": "text/plain",
        },
      });
    });

    const api = createSearchApi({
      apiBaseUrl: "https://worker.example.workers.dev",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    await expect(
      api.trackClick({
        query: "how",
        locale: "en",
        contentId: "10",
        contentTitle: "How Smart Are You",
      }),
    ).rejects.toThrow("当前请求未被允许，请稍后再试");
  });
});
