import { describe, expect, it, vi } from "vitest";

import {
  buildCanonicalApiGetRequest,
  buildCacheableJsonResponse,
  matchApiCache,
  readCachedSearchResultCount,
  storeApiCache,
} from "../src/response-cache";
import type { ResponseCache } from "../src/types";

function createMockCache(entries: Map<string, Response> = new Map()): {
  cache: ResponseCache;
  match: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
} {
  const match = vi.fn(async (req: Request) => entries.get(req.url));
  const put = vi.fn(async (req: Request, res: Response) => {
    entries.set(req.url, res);
  });
  return { cache: { match, put }, match, put };
}

function createMockContext(waitUntil?: ReturnType<typeof vi.fn>) {
  return {
    executionCtx: waitUntil ? { waitUntil } : undefined,
  };
}

describe("matchApiCache", () => {
  it("returns null when cache is undefined", async () => {
    const request = new Request("https://worker.test/api/search?q=hello");
    const result = await matchApiCache(undefined, request);
    expect(result).toBeNull();
  });

  it("returns null for non-GET requests", async () => {
    const { cache } = createMockCache();
    const request = new Request("https://worker.test/api/search", { method: "POST" });
    const result = await matchApiCache(cache, request);
    expect(result).toBeNull();
  });

  it("returns cached response on cache hit", async () => {
    const cachedResponse = new Response(JSON.stringify({ success: true }), { status: 200 });
    const entries = new Map<string, Response>();
    entries.set("https://worker.test/api/search?q=hello", cachedResponse);
    const { cache } = createMockCache(entries);

    const request = new Request("https://worker.test/api/search?q=hello");
    const result = await matchApiCache(cache, request);
    expect(result).toBe(cachedResponse);
  });

  it("returns null on cache miss", async () => {
    const { cache } = createMockCache();
    const request = new Request("https://worker.test/api/search?q=miss");
    const result = await matchApiCache(cache, request);
    expect(result).toBeNull();
  });
});

describe("buildCanonicalApiGetRequest", () => {
  it("builds a GET request with the given pathname", () => {
    const original = new Request("https://worker.test/old-path?foo=bar");
    const result = buildCanonicalApiGetRequest(original, "/api/search", { q: "hello" });

    expect(result.method).toBe("GET");
    expect(new URL(result.url).pathname).toBe("/api/search");
  });

  it("sets search params from the params object", () => {
    const original = new Request("https://worker.test/any");
    const result = buildCanonicalApiGetRequest(original, "/api/search", { q: "test", locale: "en" });
    const url = new URL(result.url);

    expect(url.searchParams.get("q")).toBe("test");
    expect(url.searchParams.get("locale")).toBe("en");
  });

  it("skips undefined and empty-string param values", () => {
    const original = new Request("https://worker.test/any");
    const result = buildCanonicalApiGetRequest(original, "/api/search", {
      q: "test",
      locale: undefined,
      extra: "",
    });
    const url = new URL(result.url);

    expect(url.searchParams.has("q")).toBe(true);
    expect(url.searchParams.has("locale")).toBe(false);
    expect(url.searchParams.has("extra")).toBe(false);
  });

  it("sorts search params alphabetically", () => {
    const original = new Request("https://worker.test/any");
    const result = buildCanonicalApiGetRequest(original, "/api/search", { z: "1", a: "2", m: "3" });
    const url = new URL(result.url);

    expect(url.search).toBe("?a=2&m=3&z=1");
  });

  it("clears hash from the original URL", () => {
    const original = new Request("https://worker.test/any#section");
    const result = buildCanonicalApiGetRequest(original, "/api/search", { q: "test" });
    const url = new URL(result.url);

    expect(url.hash).toBe("");
  });

  it("clears original search params and uses only provided params", () => {
    const original = new Request("https://worker.test/any?old=param");
    const result = buildCanonicalApiGetRequest(original, "/api/search", { q: "new" });
    const url = new URL(result.url);

    expect(url.searchParams.has("old")).toBe(false);
    expect(url.searchParams.get("q")).toBe("new");
  });

  it("converts numeric param values to strings", () => {
    const original = new Request("https://worker.test/any");
    const result = buildCanonicalApiGetRequest(original, "/api/search", { limit: 10 });
    const url = new URL(result.url);

    expect(url.searchParams.get("limit")).toBe("10");
  });
});

describe("storeApiCache", () => {
  it("does nothing when cache is undefined", () => {
    const request = new Request("https://worker.test/api/search?q=hello");
    const response = new Response("{}", {
      status: 200,
      headers: { "cache-control": "public, max-age=3600" },
    });

    // Should not throw
    storeApiCache(createMockContext(), undefined, request, response);
  });

  it("does nothing for non-GET requests", () => {
    const { cache, put } = createMockCache();
    const request = new Request("https://worker.test/api/search", { method: "POST" });
    const response = new Response("{}", {
      status: 200,
      headers: { "cache-control": "public, max-age=3600" },
    });

    storeApiCache(createMockContext(), cache, request, response);
    expect(put).not.toHaveBeenCalled();
  });

  it("does nothing for non-200 responses", () => {
    const { cache, put } = createMockCache();
    const request = new Request("https://worker.test/api/search?q=hello");
    const response = new Response("{}", {
      status: 404,
      headers: { "cache-control": "public, max-age=3600" },
    });

    storeApiCache(createMockContext(), cache, request, response);
    expect(put).not.toHaveBeenCalled();
  });

  it("does nothing when cache-control is missing", () => {
    const { cache, put } = createMockCache();
    const request = new Request("https://worker.test/api/search?q=hello");
    const response = new Response("{}", { status: 200 });

    storeApiCache(createMockContext(), cache, request, response);
    expect(put).not.toHaveBeenCalled();
  });

  it("does nothing when cache-control includes no-store", () => {
    const { cache, put } = createMockCache();
    const request = new Request("https://worker.test/api/search?q=hello");
    const response = new Response("{}", {
      status: 200,
      headers: { "cache-control": "no-store" },
    });

    storeApiCache(createMockContext(), cache, request, response);
    expect(put).not.toHaveBeenCalled();
  });

  it("does nothing when cache-control includes private", () => {
    const { cache, put } = createMockCache();
    const request = new Request("https://worker.test/api/search?q=hello");
    const response = new Response("{}", {
      status: 200,
      headers: { "cache-control": "private, max-age=3600" },
    });

    storeApiCache(createMockContext(), cache, request, response);
    expect(put).not.toHaveBeenCalled();
  });

  it("stores response in cache for valid cacheable GET 200", () => {
    const waitUntil = vi.fn();
    const { cache, put } = createMockCache();
    const request = new Request("https://worker.test/api/search?q=hello");
    const response = new Response("{}", {
      status: 200,
      headers: { "cache-control": "public, max-age=3600" },
    });

    storeApiCache(createMockContext(waitUntil), cache, request, response);
    expect(waitUntil).toHaveBeenCalledTimes(1);
  });

  it("stores response even without executionCtx (fire-and-forget)", () => {
    const { cache, put } = createMockCache();
    const request = new Request("https://worker.test/api/search?q=hello");
    const response = new Response("{}", {
      status: 200,
      headers: { "cache-control": "public, max-age=3600" },
    });

    // Should not throw even with no executionCtx
    storeApiCache({ executionCtx: undefined }, cache, request, response);
    // The put is called via a promise chain, we just verify no error
  });
});

describe("buildCacheableJsonResponse", () => {
  it("returns a JSON response with the given status and body", async () => {
    const { cache } = createMockCache();
    const request = new Request("https://worker.test/api/search?q=hello");
    const body = { success: true, data: [] };

    const response = buildCacheableJsonResponse(createMockContext(), cache, request, 200, body);

    expect(response.status).toBe(200);
    const parsed = await response.json();
    expect(parsed).toEqual(body);
  });

  it("sets content-type and CORS headers", () => {
    const { cache } = createMockCache();
    const request = new Request("https://worker.test/api/search?q=hello");

    const response = buildCacheableJsonResponse(createMockContext(), cache, request, 200, {});

    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
  });

  it("applies extra headers", () => {
    const { cache } = createMockCache();
    const request = new Request("https://worker.test/api/search?q=hello");

    const response = buildCacheableJsonResponse(
      createMockContext(),
      cache,
      request,
      200,
      {},
      {
        "cache-control": "public, max-age=600",
      },
    );

    expect(response.headers.get("cache-control")).toBe("public, max-age=600");
  });

  it("stores the response in cache for cacheable requests", () => {
    const waitUntil = vi.fn();
    const { cache, put } = createMockCache();
    const request = new Request("https://worker.test/api/search?q=hello");

    buildCacheableJsonResponse(
      createMockContext(waitUntil),
      cache,
      request,
      200,
      { success: true },
      {
        "cache-control": "public, max-age=600",
      },
    );

    expect(waitUntil).toHaveBeenCalledTimes(1);
  });

  it("does not store in cache when cache is undefined", () => {
    const request = new Request("https://worker.test/api/search?q=hello");

    const response = buildCacheableJsonResponse(createMockContext(), undefined, request, 200, { success: true });

    expect(response.status).toBe(200);
  });
});

describe("readCachedSearchResultCount", () => {
  it("returns the count of data items from a successful search response", async () => {
    const body = { success: true, data: [{ id: "1" }, { id: "2" }, { id: "3" }] };
    const response = new Response(JSON.stringify(body));

    const count = await readCachedSearchResultCount(response);
    expect(count).toBe(3);
  });

  it("returns 0 for a successful response with empty data", async () => {
    const body = { success: true, data: [] };
    const response = new Response(JSON.stringify(body));

    const count = await readCachedSearchResultCount(response);
    expect(count).toBe(0);
  });

  it("returns null when success is false", async () => {
    const body = { success: false, message: "error" };
    const response = new Response(JSON.stringify(body));

    const count = await readCachedSearchResultCount(response);
    expect(count).toBeNull();
  });

  it("returns null when data is not an array", async () => {
    const body = { success: true, data: "not-an-array" };
    const response = new Response(JSON.stringify(body));

    const count = await readCachedSearchResultCount(response);
    expect(count).toBeNull();
  });

  it("returns null for invalid JSON", async () => {
    const response = new Response("not json");

    const count = await readCachedSearchResultCount(response);
    expect(count).toBeNull();
  });

  it("does not consume the original response body (uses clone)", async () => {
    const body = { success: true, data: [{ id: "1" }] };
    const response = new Response(JSON.stringify(body));

    await readCachedSearchResultCount(response);
    // The original response should still be readable
    const parsed = await response.json();
    expect(parsed).toEqual(body);
  });
});
