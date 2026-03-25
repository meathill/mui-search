import type { Hono } from "hono";

import { type SearchResponseBody, SEARCH_QUERY_MIN_LENGTH, type SuggestResponseBody } from "@mui-search/shared";
import {
  SEARCH_CACHE_TTL_SECONDS,
  isSearchResponseBody,
  isSuggestResponseBody,
  matchApiDataCache,
  storeApiDataCache,
} from "./api-data-cache";
import { buildJsonResponse, clampLimit, parseLocaleFilter, scheduleBackgroundTask } from "./app-utils";
import {
  buildCacheableJsonResponse,
  buildCanonicalApiGetRequest,
  matchApiCache,
  readCachedSearchResultCount,
} from "./response-cache";
import type { AppDependencies, SearchEventRecord } from "./types";

const SEARCH_RESPONSE_CACHE_CONTROL = `public, max-age=${SEARCH_CACHE_TTL_SECONDS}`;

export function registerSearchRoutes(app: Hono, dependencies: AppDependencies): void {
  app.all("/api/suggest", async function handleSuggest(c) {
    if (c.req.method !== "GET") {
      return buildJsonResponse(405, { success: false, message: "Method Not Allowed" });
    }

    const localeDecision = parseLocaleFilter(c.req.query("locale"));
    if (!localeDecision.ok) {
      return buildJsonResponse(400, { success: false, message: localeDecision.message });
    }

    const query = normalizeTextQuery(c.req.query("q") ?? "");
    const limit = clampLimit(c.req.query("limit"), dependencies.maxSuggestPerRequest, 8);
    const cacheKeyRequest = buildCanonicalApiGetRequest(c.req.raw, "/api/suggest", {
      q: query,
      limit: query.length === 0 || limit === 8 ? undefined : limit,
      locale: query.length === 0 ? undefined : localeDecision.locale,
    });
    const cachedResponse = await matchApiCache(dependencies.responseCache, cacheKeyRequest);
    if (cachedResponse) {
      return cachedResponse;
    }

    const cachedResponseBody = await matchApiDataCache(
      dependencies.apiDataCache,
      cacheKeyRequest,
      isSuggestResponseBody,
    );
    if (cachedResponseBody) {
      return buildCacheableJsonResponse(c, dependencies.responseCache, cacheKeyRequest, 200, cachedResponseBody, {
        "cache-control": SEARCH_RESPONSE_CACHE_CONTROL,
      });
    }

    const suggestions =
      query.length === 0 ? [] : await dependencies.querySuggestions(query, limit, localeDecision.locale);
    const responseBody: SuggestResponseBody = {
      success: true,
      suggestions,
    };

    storeApiDataCache(
      c,
      dependencies.apiDataCache,
      cacheKeyRequest,
      responseBody,
      SEARCH_CACHE_TTL_SECONDS,
      "[cache] 写入 /api/suggest KV 缓存失败",
    );

    return buildCacheableJsonResponse(c, dependencies.responseCache, cacheKeyRequest, 200, responseBody, {
      "cache-control": SEARCH_RESPONSE_CACHE_CONTROL,
    });
  });

  app.all("/api/search", async function handleSearch(c) {
    if (c.req.method !== "GET") {
      return buildJsonResponse(405, { success: false, message: "Method Not Allowed" });
    }

    const rawQuery = c.req.query("q")?.trim() || c.req.query("query")?.trim();
    const localeDecision = parseLocaleFilter(c.req.query("locale"));
    if (!localeDecision.ok) {
      return buildJsonResponse(400, { success: false, message: localeDecision.message });
    }

    const query = normalizeTextQuery(rawQuery ?? "");
    if (!query || query.length < SEARCH_QUERY_MIN_LENGTH) {
      return buildJsonResponse(400, { success: false, message: `query 至少包含 ${SEARCH_QUERY_MIN_LENGTH} 个字符` });
    }

    const limit = clampLimit(c.req.query("limit"), dependencies.maxSearchPerRequest, 10);
    const cacheKeyRequest = buildCanonicalApiGetRequest(c.req.raw, "/api/search", {
      q: query,
      limit: limit === 10 ? undefined : limit,
      locale: localeDecision.locale,
    });
    const cachedResponse = await matchApiCache(dependencies.responseCache, cacheKeyRequest);
    if (cachedResponse) {
      const cachedResultCount = await readCachedSearchResultCount(cachedResponse);
      if (cachedResultCount !== null) {
        scheduleBackgroundTask(
          c,
          dependencies.recordSearchEvent({
            query,
            locale: localeDecision.locale ?? "all",
            resultCount: cachedResultCount,
          }),
          "[analytics] 写入搜索记录失败",
        );
      }

      return cachedResponse;
    }

    const cachedResponseBody = await matchApiDataCache(
      dependencies.apiDataCache,
      cacheKeyRequest,
      isSearchResponseBody,
    );
    if (cachedResponseBody) {
      scheduleBackgroundTask(
        c,
        dependencies.recordSearchEvent({
          query,
          locale: localeDecision.locale ?? "all",
          resultCount: cachedResponseBody.data.length,
        }),
        "[analytics] 写入搜索记录失败",
      );

      return buildCacheableJsonResponse(c, dependencies.responseCache, cacheKeyRequest, 200, cachedResponseBody, {
        "cache-control": SEARCH_RESPONSE_CACHE_CONTROL,
      });
    }

    const data = await dependencies.queryHybridSearch(query, limit, localeDecision.locale);
    const responseBody: SearchResponseBody = {
      success: true,
      data: truncateSearchResults(data),
    };

    const searchEvent: SearchEventRecord = {
      query,
      locale: localeDecision.locale ?? "all",
      resultCount: data.length,
    };

    scheduleBackgroundTask(c, dependencies.recordSearchEvent(searchEvent), "[analytics] 写入搜索记录失败");
    storeApiDataCache(
      c,
      dependencies.apiDataCache,
      cacheKeyRequest,
      responseBody,
      SEARCH_CACHE_TTL_SECONDS,
      "[cache] 写入 /api/search KV 缓存失败",
    );

    return buildCacheableJsonResponse(c, dependencies.responseCache, cacheKeyRequest, 200, responseBody, {
      "cache-control": SEARCH_RESPONSE_CACHE_CONTROL,
    });
  });
}

function normalizeTextQuery(query: string): string {
  return query.trim().replace(/\s+/g, " ");
}

function truncateSearchResults(data: SearchResponseBody["data"]): SearchResponseBody["data"] {
  return data.map((item) => {
    if (item.content.length <= 120) {
      return item;
    }

    let truncated = item.content.slice(0, 120);
    const nextChar = item.content[120] ?? "";
    if (!/[\s.,;:!?，。！？]/.test(nextChar)) {
      const lastSpaceIndex = truncated.lastIndexOf(" ");
      if (lastSpaceIndex > 0) {
        truncated = truncated.slice(0, lastSpaceIndex);
      }
    }

    return {
      ...item,
      content: `${truncated}...`,
    };
  });
}
