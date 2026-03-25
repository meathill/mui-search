import type { SearchResponseBody } from "@mui-search/shared";
import { buildJsonResponse, scheduleBackgroundTask } from "./app-utils";
import type { ResponseCache } from "./types";

export async function matchApiCache(cache: ResponseCache | undefined, request: Request): Promise<Response | null> {
  if (!cache || request.method !== "GET") {
    return null;
  }

  return (await cache.match(buildApiCacheKey(request))) ?? null;
}

export function buildCanonicalApiGetRequest(
  request: Request,
  pathname: string,
  params: Record<string, string | number | undefined>,
): Request {
  const url = new URL(request.url);
  url.pathname = pathname;
  url.hash = "";
  url.search = "";

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") {
      continue;
    }

    url.searchParams.set(key, String(value));
  }

  url.searchParams.sort();
  return new Request(url.toString(), {
    method: "GET",
  });
}

export function storeApiCache(
  c: { executionCtx?: { waitUntil?(promise: Promise<unknown>): void } },
  cache: ResponseCache | undefined,
  request: Request,
  response: Response,
): void {
  if (!cache || request.method !== "GET" || response.status !== 200) {
    return;
  }

  const cacheControl = response.headers.get("cache-control")?.toLowerCase();
  if (!cacheControl || cacheControl.includes("no-store") || cacheControl.includes("private")) {
    return;
  }

  scheduleBackgroundTask(c, cache.put(buildApiCacheKey(request), response.clone()), "[cache] 写入 API 响应缓存失败");
}

export function buildCacheableJsonResponse(
  c: { executionCtx?: { waitUntil?(promise: Promise<unknown>): void } },
  cache: ResponseCache | undefined,
  request: Request,
  status: number,
  body: unknown,
  extraHeaders?: Record<string, string>,
): Response {
  const response = buildJsonResponse(status, body, extraHeaders);
  storeApiCache(c, cache, request, response);
  return response;
}

export async function readCachedSearchResultCount(response: Response): Promise<number | null> {
  try {
    const payload = await response.clone().json<SearchResponseBody>();
    if (!payload.success || !Array.isArray(payload.data)) {
      return null;
    }

    return payload.data.length;
  } catch (error) {
    console.error("[cache] 读取 /api/search 缓存响应失败", error);
    return null;
  }
}

function buildApiCacheKey(request: Request): Request {
  const url = new URL(request.url);
  url.hash = "";
  url.searchParams.sort();

  return new Request(url.toString(), {
    method: "GET",
  });
}
