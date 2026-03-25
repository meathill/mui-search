import { describe, expect, it, vi } from "vitest";

import { createWorkerApp } from "../src/app";
import { buildCanonicalApiGetRequest } from "../src/response-cache";
import type { ClickEventRecord, HybridSearchResult, SearchEventRecord } from "../src/types";
import {
  buildCachedJsonResponse,
  buildDependencies,
  createMockApiDataCache,
  createMockResponseCache,
} from "./app-test-helpers";

const SEARCH_CACHE_CONTROL = "public, max-age=604800";

describe("createWorkerApp 基础路由", () => {
  it("非 API 路径返回 404 JSON", async () => {
    const app = createWorkerApp(buildDependencies());

    const response = await app.fetch(new Request("https://worker.test/"));
    const payload = (await response.json()) as {
      success: boolean;
      message: string;
    };

    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(payload.success).toBe(false);
    expect(payload.message).toBe("Not Found");
  });

  it("OPTIONS 预检请求返回 204", async () => {
    const app = createWorkerApp(buildDependencies());

    const response = await app.fetch(
      new Request("https://worker.test/api/search", {
        method: "OPTIONS",
        headers: {
          origin: "https://example.com",
        },
      }),
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-methods")).toBe("GET,POST,OPTIONS");
  });

  it("suggest 对非 GET 请求返回 405", async () => {
    const app = createWorkerApp(buildDependencies());

    const response = await app.fetch(
      new Request("https://worker.test/api/suggest?q=tidb", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(405);
  });

  it("suggest 支持 locale 参数并向下传递", async () => {
    const querySuggestions = vi.fn(async () => [{ id: "1", text: "你好" }]);
    const app = createWorkerApp(
      buildDependencies({
        querySuggestions,
      }),
    );

    const response = await app.fetch(new Request("https://worker.test/api/suggest?q=hello&locale=zh"));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(SEARCH_CACHE_CONTROL);
    expect(querySuggestions).toHaveBeenCalledWith("hello", 8, "zh");
  });

  it("suggest 成功响应会同时写入 KV 数据缓存和 Worker Cache API", async () => {
    const responseCache = createMockResponseCache();
    const apiDataCache = createMockApiDataCache();
    const querySuggestions = vi.fn(async () => [{ id: "1", text: "你好" }]);
    const app = createWorkerApp(
      buildDependencies({
        responseCache: responseCache.cache,
        apiDataCache: apiDataCache.cache,
        querySuggestions,
      }),
    );

    const response = await app.fetch(new Request("https://worker.test/api/suggest?q=hello&locale=zh&limit=8"));
    const payload = (await response.json()) as {
      success: boolean;
      suggestions: Array<{ id: string; text: string }>;
    };

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(querySuggestions).toHaveBeenCalledTimes(1);
    expect(responseCache.put).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => {
      expect(apiDataCache.put).toHaveBeenCalledTimes(1);
    });

    const [cacheKey, cachedResponse] = responseCache.put.mock.calls[0] as [Request, Response];
    expect(cacheKey.url).toBe("https://worker.test/api/suggest?locale=zh&q=hello");
    expect(cachedResponse.headers.get("access-control-allow-origin")).toBe("*");
  });

  it("suggest 命中 Worker Cache API 时直接返回缓存", async () => {
    const responseCache = createMockResponseCache();
    await responseCache.prime(
      buildCanonicalApiGetRequest(
        new Request("https://worker.test/api/suggest?q=hello&locale=zh&limit=8"),
        "/api/suggest",
        {
          q: "hello",
          locale: "zh",
        },
      ),
      buildCachedJsonResponse(
        {
          success: true,
          suggestions: [{ id: "1", text: "缓存命中" }],
        },
        SEARCH_CACHE_CONTROL,
      ),
    );
    const querySuggestions = vi.fn(async () => [{ id: "2", text: "不应该执行" }]);
    const app = createWorkerApp(
      buildDependencies({
        responseCache: responseCache.cache,
        querySuggestions,
      }),
    );

    const response = await app.fetch(new Request("https://worker.test/api/suggest?q=hello&locale=zh&limit=8"));
    const payload = (await response.json()) as {
      success: boolean;
      suggestions: Array<{ id: string; text: string }>;
    };

    expect(response.status).toBe(200);
    expect(payload.suggestions).toEqual([{ id: "1", text: "缓存命中" }]);
    expect(querySuggestions).not.toHaveBeenCalled();
    expect(responseCache.match).toHaveBeenCalledTimes(1);
    expect(responseCache.put).not.toHaveBeenCalled();
  });

  it("suggest 命中 KV 数据缓存时会回填 Worker Cache API", async () => {
    const responseCache = createMockResponseCache();
    const apiDataCache = createMockApiDataCache();
    const querySuggestions = vi.fn(async () => [{ id: "2", text: "不应该执行" }]);
    const cacheKeyRequest = buildCanonicalApiGetRequest(
      new Request("https://worker.test/api/suggest?q=hello&locale=zh"),
      "/api/suggest",
      {
        q: "hello",
        locale: "zh",
      },
    );
    await apiDataCache.primeRequest(cacheKeyRequest, {
      success: true,
      suggestions: [{ id: "1", text: "KV 命中" }],
    });
    const app = createWorkerApp(
      buildDependencies({
        responseCache: responseCache.cache,
        apiDataCache: apiDataCache.cache,
        querySuggestions,
      }),
    );

    const response = await app.fetch(new Request("https://worker.test/api/suggest?q=hello&locale=zh"));
    const payload = (await response.json()) as {
      success: boolean;
      suggestions: Array<{ id: string; text: string }>;
    };

    expect(response.status).toBe(200);
    expect(payload.suggestions).toEqual([{ id: "1", text: "KV 命中" }]);
    expect(querySuggestions).not.toHaveBeenCalled();
    expect(responseCache.put).toHaveBeenCalledTimes(1);
    expect(apiDataCache.put).not.toHaveBeenCalled();
  });

  it("suggest 对空关键词返回空数组", async () => {
    const querySuggestions = vi.fn(async () => [{ id: "1", text: "不应该被调用" }]);
    const app = createWorkerApp(
      buildDependencies({
        querySuggestions,
      }),
    );

    const response = await app.fetch(new Request("https://worker.test/api/suggest?q=  "));
    const data = (await response.json()) as {
      success: boolean;
      suggestions: unknown[];
    };

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.suggestions).toEqual([]);
    expect(response.headers.get("cache-control")).toBe(SEARCH_CACHE_CONTROL);
    expect(querySuggestions).not.toHaveBeenCalled();
  });

  it("search 对非 GET 请求返回 405", async () => {
    const app = createWorkerApp(buildDependencies());

    const response = await app.fetch(
      new Request("https://worker.test/api/search?q=tidb", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(405);
  });

  it("search 成功返回融合结果并写入双层缓存", async () => {
    const responseCache = createMockResponseCache();
    const apiDataCache = createMockApiDataCache();
    const queryHybridSearch = vi.fn(async () => [
      {
        id: "101",
        title: "TiDB Cloud",
        content: "支持向量检索",
        score: 0.032,
        locale: "zh",
      },
    ]);
    const recordSearchEvent = vi.fn(async (_event: SearchEventRecord) => {});
    const app = createWorkerApp(
      buildDependencies({
        responseCache: responseCache.cache,
        apiDataCache: apiDataCache.cache,
        queryHybridSearch,
        recordSearchEvent,
      }),
    );

    const response = await app.fetch(
      new Request("https://worker.test/api/search?q=TiDB&locale=zh&limit=10", {
        headers: {
          "cf-connecting-ip": "127.0.0.1",
        },
      }),
    );
    const data = (await response.json()) as {
      success: boolean;
      data: HybridSearchResult[];
    };

    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(response.headers.get("cache-control")).toBe(SEARCH_CACHE_CONTROL);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
    expect(data.data[0]?.id).toBe("101");
    expect(queryHybridSearch).toHaveBeenCalledWith("TiDB", 10, "zh");
    expect(recordSearchEvent).toHaveBeenCalledWith({
      query: "TiDB",
      locale: "zh",
      resultCount: 1,
    });
    expect(responseCache.put).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => {
      expect(apiDataCache.put).toHaveBeenCalledTimes(1);
    });
  });

  it("search 命中 Worker Cache API 时直接返回缓存且仍记录搜索事件", async () => {
    const responseCache = createMockResponseCache();
    const recordSearchEvent = vi.fn(async (_event: SearchEventRecord) => {});
    await responseCache.prime(
      buildCanonicalApiGetRequest(
        new Request("https://worker.test/api/search?q=TiDB&locale=zh&limit=10"),
        "/api/search",
        {
          q: "TiDB",
          locale: "zh",
        },
      ),
      buildCachedJsonResponse(
        {
          success: true,
          data: [
            {
              id: "101",
              title: "TiDB Cloud",
              content: "支持向量检索",
              score: 0.032,
              locale: "zh",
            },
          ],
        },
        SEARCH_CACHE_CONTROL,
      ),
    );
    const queryHybridSearch = vi.fn(async () => [
      {
        id: "999",
        title: "不应该执行",
        content: "不应该执行",
        score: 0.001,
        locale: "zh",
      },
    ]);
    const app = createWorkerApp(
      buildDependencies({
        responseCache: responseCache.cache,
        queryHybridSearch,
        recordSearchEvent,
      }),
    );

    const response = await app.fetch(new Request("https://worker.test/api/search?q=TiDB&locale=zh&limit=10"));
    const payload = (await response.json()) as {
      success: boolean;
      data: HybridSearchResult[];
    };

    expect(response.status).toBe(200);
    expect(payload.data).toHaveLength(1);
    expect(queryHybridSearch).not.toHaveBeenCalled();
    expect(recordSearchEvent).toHaveBeenCalledWith({
      query: "TiDB",
      locale: "zh",
      resultCount: 1,
    });
    expect(responseCache.put).not.toHaveBeenCalled();
  });

  it("search 命中 KV 数据缓存时仍记录搜索事件并回填 Worker Cache API", async () => {
    const responseCache = createMockResponseCache();
    const apiDataCache = createMockApiDataCache();
    const recordSearchEvent = vi.fn(async (_event: SearchEventRecord) => {});
    const queryHybridSearch = vi.fn(async () => [
      {
        id: "999",
        title: "不应该执行",
        content: "不应该执行",
        score: 0.001,
        locale: "zh",
      },
    ]);
    const cacheKeyRequest = buildCanonicalApiGetRequest(
      new Request("https://worker.test/api/search?q=TiDB&locale=zh"),
      "/api/search",
      {
        q: "TiDB",
        locale: "zh",
      },
    );
    await apiDataCache.primeRequest(cacheKeyRequest, {
      success: true,
      data: [
        {
          id: "101",
          title: "TiDB Cloud",
          content: "支持向量检索...",
          score: 0.032,
          locale: "zh",
        },
      ],
    });
    const app = createWorkerApp(
      buildDependencies({
        responseCache: responseCache.cache,
        apiDataCache: apiDataCache.cache,
        queryHybridSearch,
        recordSearchEvent,
      }),
    );

    const response = await app.fetch(
      new Request("https://worker.test/api/search?q=TiDB&locale=zh&limit=10", {
        headers: {
          "cf-connecting-ip": "127.0.0.1",
        },
      }),
    );
    const payload = (await response.json()) as {
      success: boolean;
      data: HybridSearchResult[];
    };

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data).toHaveLength(1);
    expect(queryHybridSearch).not.toHaveBeenCalled();
    expect(recordSearchEvent).toHaveBeenCalledWith({
      query: "TiDB",
      locale: "zh",
      resultCount: 1,
    });
    expect(responseCache.put).toHaveBeenCalledTimes(1);
    expect(apiDataCache.put).not.toHaveBeenCalled();
  });

  it("click 接口可记录真实点击", async () => {
    const recordClickEvent = vi.fn(async (_event: ClickEventRecord) => {});
    const app = createWorkerApp(
      buildDependencies({
        recordClickEvent,
      }),
    );

    const response = await app.fetch(
      new Request("https://worker.test/api/click", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          query: "how",
          locale: "en",
          contentId: "201",
          contentTitle: "How Smart Are You",
          contentLocale: "en",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(recordClickEvent).toHaveBeenCalledWith({
      query: "how",
      locale: "en",
      contentId: "201",
      contentTitle: "How Smart Are You",
      contentLocale: "en",
    });
  });

  it("click 缺少 contentId 时返回 400", async () => {
    const app = createWorkerApp(buildDependencies());

    const response = await app.fetch(
      new Request("https://worker.test/api/click", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          query: "how",
          contentTitle: "How Smart Are You",
        }),
      }),
    );

    expect(response.status).toBe(400);
  });
});
