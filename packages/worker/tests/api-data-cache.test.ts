import { describe, expect, it, vi } from "vitest";

import {
  SEARCH_CACHE_TTL_SECONDS,
  buildApiDataCacheKey,
  createApiDataKvCache,
  isSearchResponseBody,
} from "../src/api-data-cache";
import { buildCanonicalApiGetRequest } from "../src/response-cache";

describe("api-data-cache", () => {
  it("相同语义的缓存请求应生成相同 KV key", async () => {
    const requestA = buildCanonicalApiGetRequest(
      new Request("https://worker.test/api/search?locale=zh&q=TiDB"),
      "/api/search",
      {
        q: "TiDB",
        locale: "zh",
      },
    );
    const requestB = buildCanonicalApiGetRequest(
      new Request("https://worker.test/api/search?q=TiDB&locale=zh&limit=10"),
      "/api/search",
      {
        q: "TiDB",
        locale: "zh",
      },
    );

    const keyA = await buildApiDataCacheKey(requestA);
    const keyB = await buildApiDataCacheKey(requestB);

    expect(keyA).toBe(keyB);
    expect(keyA).toMatch(/^api:v1:api-search:/);
  });

  it("写入 KV 时应透传 TTL", async () => {
    const put = vi.fn(async () => {});
    const get = vi.fn(async () => null);
    const cache = createApiDataKvCache({
      get,
      put,
    } as unknown as KVNamespace);
    const request = buildCanonicalApiGetRequest(
      new Request("https://worker.test/api/search?q=TiDB&locale=zh"),
      "/api/search",
      {
        q: "TiDB",
        locale: "zh",
      },
    );
    const cacheKey = await buildApiDataCacheKey(request);

    await cache.put(cacheKey, { success: true, data: [] }, SEARCH_CACHE_TTL_SECONDS);

    expect(put).toHaveBeenCalledWith(cacheKey, JSON.stringify({ success: true, data: [] }), {
      expirationTtl: SEARCH_CACHE_TTL_SECONDS,
    });
  });

  it("读取 KV 时应使用 validator 过滤非法 payload", async () => {
    const get = vi.fn(async () => ({ success: false, data: [] }));
    const put = vi.fn(async () => {});
    const cache = createApiDataKvCache({
      get,
      put,
    } as unknown as KVNamespace);

    const payload = await cache.get("search-key", isSearchResponseBody);

    expect(payload).toBeNull();
    expect(get).toHaveBeenCalledWith("search-key", "json");
  });
});
