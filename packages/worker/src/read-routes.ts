import type { Hono } from "hono";

import {
  type ContentQueriesResponseBody,
  type DailySearchStatsResponseBody,
  type HotQueriesResponseBody,
  type HotResponseBody,
  type SegmentedTopStatsResponseBody,
} from "@mui-search/shared";
import {
  HOT_CACHE_TTL_SECONDS,
  HOT_QUERIES_CACHE_TTL_SECONDS,
  STATS_CACHE_TTL_SECONDS,
  isContentQueriesResponseBody,
  isDailySearchStatsResponseBody,
  isHotQueriesResponseBody,
  isHotResponseBody,
  isSegmentedTopStatsResponseBody,
  matchApiDataCache,
  storeApiDataCache,
} from "./api-data-cache";
import {
  buildJsonResponse,
  clampLimit,
  parseLocaleFilter,
  parseStatsDimension,
  parseStatsGranularity,
  resolveDefaultPeriods,
  resolveMaxPeriods,
} from "./app-utils";
import { buildHotContentsFromGa4Payload } from "./hot-ga4";
import { buildCacheableJsonResponse, buildCanonicalApiGetRequest, matchApiCache } from "./response-cache";
import type { AppDependencies } from "./types";

const HOT_RESPONSE_CACHE_CONTROL = `public, max-age=${HOT_CACHE_TTL_SECONDS}`;
const HOT_QUERIES_RESPONSE_CACHE_CONTROL = `public, max-age=${HOT_QUERIES_CACHE_TTL_SECONDS}`;
const STATS_RESPONSE_CACHE_CONTROL = `public, max-age=${STATS_CACHE_TTL_SECONDS}`;

export function registerReadRoutes(app: Hono, dependencies: AppDependencies): void {
  app.all("/api/hot", async function handleHot(c) {
    if (c.req.method !== "GET") {
      return buildJsonResponse(405, { success: false, message: "Method Not Allowed" });
    }

    const localeDecision = parseLocaleFilter(c.req.query("locale"));
    if (!localeDecision.ok) {
      return buildJsonResponse(400, { success: false, message: localeDecision.message });
    }

    const limit = clampLimit(c.req.query("limit"), dependencies.maxHotPerRequest, 10);
    const targetLocale = localeDecision.locale ?? "cn";
    const cacheKeyRequest = buildCanonicalApiGetRequest(c.req.raw, "/api/hot", {
      limit: limit === 10 ? undefined : limit,
      locale: targetLocale === "cn" ? undefined : targetLocale,
    });
    const cachedResponse = await matchApiCache(dependencies.responseCache, cacheKeyRequest);
    if (cachedResponse) {
      return cachedResponse;
    }

    const cachedResponseBody = await matchApiDataCache(dependencies.apiDataCache, cacheKeyRequest, isHotResponseBody);
    if (cachedResponseBody) {
      return buildCacheableJsonResponse(c, dependencies.responseCache, cacheKeyRequest, 200, cachedResponseBody, {
        "cache-control": HOT_RESPONSE_CACHE_CONTROL,
      });
    }

    let data: HotResponseBody["data"] = [];
    if (dependencies.hotContentSourceUrl) {
      try {
        const sourceUrl = dependencies.hotContentSourceUrl.replace("{locale}", targetLocale);
        const response = await fetch(sourceUrl);
        if (response.ok) {
          const payload = await response.json();
          data = buildHotContentsFromGa4Payload(payload, {
            targetLocale,
            limit,
            contentOrigin: dependencies.hotContentOrigin,
          });
        }
      } catch (error) {
        console.error("[api/hot] fetch hot content source failed", error);
      }
    }

    const responseBody: HotResponseBody = {
      success: true,
      data,
    };

    storeApiDataCache(
      c,
      dependencies.apiDataCache,
      cacheKeyRequest,
      responseBody,
      HOT_CACHE_TTL_SECONDS,
      "[cache] 写入 /api/hot KV 缓存失败",
    );

    return buildCacheableJsonResponse(c, dependencies.responseCache, cacheKeyRequest, 200, responseBody, {
      "cache-control": HOT_RESPONSE_CACHE_CONTROL,
    });
  });

  app.all("/api/hot-queries", async function handleHotQueries(c) {
    if (c.req.method !== "GET") {
      return buildJsonResponse(405, { success: false, message: "Method Not Allowed" });
    }

    const localeDecision = parseLocaleFilter(c.req.query("locale"));
    if (!localeDecision.ok) {
      return buildJsonResponse(400, { success: false, message: localeDecision.message });
    }

    const hours = clampLimit(c.req.query("hours"), 168, 24);
    const limit = clampLimit(c.req.query("limit"), dependencies.maxHotPerRequest, 8);
    const cacheKeyRequest = buildCanonicalApiGetRequest(c.req.raw, "/api/hot-queries", {
      hours: hours === 24 ? undefined : hours,
      limit: limit === 8 ? undefined : limit,
      locale: localeDecision.locale,
    });
    const cachedResponse = await matchApiCache(dependencies.responseCache, cacheKeyRequest);
    if (cachedResponse) {
      return cachedResponse;
    }

    const cachedResponseBody = await matchApiDataCache(
      dependencies.apiDataCache,
      cacheKeyRequest,
      isHotQueriesResponseBody,
    );
    if (cachedResponseBody) {
      return buildCacheableJsonResponse(c, dependencies.responseCache, cacheKeyRequest, 200, cachedResponseBody, {
        "cache-control": HOT_QUERIES_RESPONSE_CACHE_CONTROL,
      });
    }

    const data = await dependencies.queryHourlyHotQueries(hours, limit, localeDecision.locale);
    const responseBody: HotQueriesResponseBody = {
      success: true,
      data,
    };

    storeApiDataCache(
      c,
      dependencies.apiDataCache,
      cacheKeyRequest,
      responseBody,
      HOT_QUERIES_CACHE_TTL_SECONDS,
      "[cache] 写入 /api/hot-queries KV 缓存失败",
    );

    return buildCacheableJsonResponse(c, dependencies.responseCache, cacheKeyRequest, 200, responseBody, {
      "cache-control": HOT_QUERIES_RESPONSE_CACHE_CONTROL,
    });
  });

  app.all("/api/stats/daily-search", async function handleDailySearchStats(c) {
    if (c.req.method !== "GET") {
      return buildJsonResponse(405, { success: false, message: "Method Not Allowed" });
    }

    const localeDecision = parseLocaleFilter(c.req.query("locale"));
    if (!localeDecision.ok) {
      return buildJsonResponse(400, { success: false, message: localeDecision.message });
    }

    const days = clampLimit(c.req.query("days"), 90, 14);
    const cacheKeyRequest = buildCanonicalApiGetRequest(c.req.raw, "/api/stats/daily-search", {
      days: days === 14 ? undefined : days,
      locale: localeDecision.locale,
    });
    const cachedResponse = await matchApiCache(dependencies.responseCache, cacheKeyRequest);
    if (cachedResponse) {
      return cachedResponse;
    }

    const cachedResponseBody = await matchApiDataCache(
      dependencies.apiDataCache,
      cacheKeyRequest,
      isDailySearchStatsResponseBody,
    );
    if (cachedResponseBody) {
      return buildCacheableJsonResponse(c, dependencies.responseCache, cacheKeyRequest, 200, cachedResponseBody, {
        "cache-control": STATS_RESPONSE_CACHE_CONTROL,
      });
    }

    const data = await dependencies.queryDailySearchStats(days, localeDecision.locale);
    const responseBody: DailySearchStatsResponseBody = {
      success: true,
      data,
    };

    storeApiDataCache(
      c,
      dependencies.apiDataCache,
      cacheKeyRequest,
      responseBody,
      STATS_CACHE_TTL_SECONDS,
      "[cache] 写入 /api/stats/daily-search KV 缓存失败",
    );

    return buildCacheableJsonResponse(c, dependencies.responseCache, cacheKeyRequest, 200, responseBody, {
      "cache-control": STATS_RESPONSE_CACHE_CONTROL,
    });
  });

  app.all("/api/stats/segmented-top", async function handleSegmentedTopStats(c) {
    if (c.req.method !== "GET") {
      return buildJsonResponse(405, { success: false, message: "Method Not Allowed" });
    }

    const localeDecision = parseLocaleFilter(c.req.query("locale"));
    if (!localeDecision.ok) {
      return buildJsonResponse(400, { success: false, message: localeDecision.message });
    }

    const granularityDecision = parseStatsGranularity(c.req.query("granularity"));
    if (!granularityDecision.ok) {
      return buildJsonResponse(400, { success: false, message: granularityDecision.message });
    }

    const dimensionDecision = parseStatsDimension(c.req.query("dimension"));
    if (!dimensionDecision.ok) {
      return buildJsonResponse(400, { success: false, message: dimensionDecision.message });
    }

    const defaultPeriods = resolveDefaultPeriods(granularityDecision.granularity);
    const periods = clampLimit(
      c.req.query("periods"),
      resolveMaxPeriods(granularityDecision.granularity),
      defaultPeriods,
    );
    const limit = clampLimit(c.req.query("limit"), dependencies.maxSegmentedTopPerRequest, 8);
    const cacheKeyRequest = buildCanonicalApiGetRequest(c.req.raw, "/api/stats/segmented-top", {
      granularity: granularityDecision.granularity === "day" ? undefined : granularityDecision.granularity,
      dimension: dimensionDecision.dimension === "query" ? undefined : dimensionDecision.dimension,
      periods: periods === defaultPeriods ? undefined : periods,
      limit: limit === 8 ? undefined : limit,
      locale: localeDecision.locale,
    });
    const cachedResponse = await matchApiCache(dependencies.responseCache, cacheKeyRequest);
    if (cachedResponse) {
      return cachedResponse;
    }

    const cachedResponseBody = await matchApiDataCache(
      dependencies.apiDataCache,
      cacheKeyRequest,
      isSegmentedTopStatsResponseBody,
    );
    if (cachedResponseBody) {
      return buildCacheableJsonResponse(c, dependencies.responseCache, cacheKeyRequest, 200, cachedResponseBody, {
        "cache-control": STATS_RESPONSE_CACHE_CONTROL,
      });
    }

    const data = await dependencies.querySegmentedTopStats(
      granularityDecision.granularity,
      dimensionDecision.dimension,
      periods,
      limit,
      localeDecision.locale,
    );
    const responseBody: SegmentedTopStatsResponseBody = {
      success: true,
      data,
    };

    storeApiDataCache(
      c,
      dependencies.apiDataCache,
      cacheKeyRequest,
      responseBody,
      STATS_CACHE_TTL_SECONDS,
      "[cache] 写入 /api/stats/segmented-top KV 缓存失败",
    );

    return buildCacheableJsonResponse(c, dependencies.responseCache, cacheKeyRequest, 200, responseBody, {
      "cache-control": STATS_RESPONSE_CACHE_CONTROL,
    });
  });

  app.all("/api/stats/content-queries", async function handleContentQueries(c) {
    if (c.req.method !== "GET") {
      return buildJsonResponse(405, { success: false, message: "Method Not Allowed" });
    }

    const contentId = c.req.query("contentId")?.trim();
    if (!contentId) {
      return buildJsonResponse(400, { success: false, message: "contentId 参数不能为空" });
    }

    const days = clampLimit(c.req.query("days"), 90, 30);
    const limit = clampLimit(c.req.query("limit"), 50, 20);
    const cacheKeyRequest = buildCanonicalApiGetRequest(c.req.raw, "/api/stats/content-queries", {
      contentId,
      days: days === 30 ? undefined : days,
      limit: limit === 20 ? undefined : limit,
    });
    const cachedResponse = await matchApiCache(dependencies.responseCache, cacheKeyRequest);
    if (cachedResponse) {
      return cachedResponse;
    }

    const cachedResponseBody = await matchApiDataCache(
      dependencies.apiDataCache,
      cacheKeyRequest,
      isContentQueriesResponseBody,
    );
    if (cachedResponseBody) {
      return buildCacheableJsonResponse(c, dependencies.responseCache, cacheKeyRequest, 200, cachedResponseBody, {
        "cache-control": STATS_RESPONSE_CACHE_CONTROL,
      });
    }

    const data = await dependencies.queryContentQueries(contentId, days, limit);
    const responseBody: ContentQueriesResponseBody = {
      success: true,
      data,
    };

    storeApiDataCache(
      c,
      dependencies.apiDataCache,
      cacheKeyRequest,
      responseBody,
      STATS_CACHE_TTL_SECONDS,
      "[cache] 写入 /api/stats/content-queries KV 缓存失败",
    );

    return buildCacheableJsonResponse(c, dependencies.responseCache, cacheKeyRequest, 200, responseBody, {
      "cache-control": STATS_RESPONSE_CACHE_CONTROL,
    });
  });
}
