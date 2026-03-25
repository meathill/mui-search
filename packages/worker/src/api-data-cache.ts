import type {
  ContentQueriesResponseBody,
  DailySearchStatsResponseBody,
  HotQueriesResponseBody,
  HotResponseBody,
  SearchResponseBody,
  SegmentedTopStatsResponseBody,
  SuggestResponseBody,
} from "@mui-search/shared";
import { scheduleBackgroundTask } from "./app-utils";
import type { ApiDataCache } from "./types";

const API_DATA_CACHE_VERSION = "v1";

export const SEARCH_CACHE_TTL_SECONDS = 7 * 24 * 60 * 60;
export const HOT_CACHE_TTL_SECONDS = 12 * 60 * 60;
export const HOT_QUERIES_CACHE_TTL_SECONDS = 60 * 60;
export const STATS_CACHE_TTL_SECONDS = 5 * 60;

type CacheTaskContext = {
  executionCtx?: {
    waitUntil?(promise: Promise<unknown>): void;
  };
};

type CacheBodyValidator<T> = (value: unknown) => value is T;

export function createApiDataKvCache(namespace: KVNamespace): ApiDataCache {
  return {
    async get<T>(key: string, validator: CacheBodyValidator<T>): Promise<T | null> {
      try {
        const payload = await namespace.get<unknown>(key, "json");
        if (!validator(payload)) {
          return null;
        }

        return payload;
      } catch (error) {
        console.error("[cache] 读取 API KV 缓存失败", error);
        return null;
      }
    },
    async put(key: string, responseBody: unknown, ttlSeconds: number): Promise<void> {
      await namespace.put(key, JSON.stringify(responseBody), {
        expirationTtl: ttlSeconds,
      });
    },
  };
}

export async function buildApiDataCacheKey(request: Request): Promise<string> {
  const url = new URL(request.url);
  url.hash = "";
  url.searchParams.sort();

  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(url.toString()));
  return `api:${API_DATA_CACHE_VERSION}:${sanitizeCacheScope(url.pathname)}:${toHex(digest)}`;
}

export async function matchApiDataCache<T>(
  cache: ApiDataCache | undefined,
  request: Request,
  validator: CacheBodyValidator<T>,
): Promise<T | null> {
  if (!cache) {
    return null;
  }

  const cacheKey = await buildApiDataCacheKey(request);
  return cache.get(cacheKey, validator);
}

export function storeApiDataCache(
  c: CacheTaskContext,
  cache: ApiDataCache | undefined,
  request: Request,
  responseBody: unknown,
  ttlSeconds: number,
  errorMessage = "[cache] 写入 API KV 缓存失败",
): void {
  if (!cache) {
    return;
  }

  scheduleBackgroundTask(
    c,
    buildApiDataCacheKey(request).then(function putApiDataCache(cacheKey) {
      return cache.put(cacheKey, responseBody, ttlSeconds);
    }),
    errorMessage,
  );
}

export function isSuggestResponseBody(value: unknown): value is SuggestResponseBody {
  return isSuccessfulPayloadWithArray(value, "suggestions");
}

export function isSearchResponseBody(value: unknown): value is SearchResponseBody {
  return isSuccessfulPayloadWithArray(value, "data");
}

export function isHotResponseBody(value: unknown): value is HotResponseBody {
  return isSuccessfulPayloadWithArray(value, "data");
}

export function isHotQueriesResponseBody(value: unknown): value is HotQueriesResponseBody {
  return isSuccessfulPayloadWithArray(value, "data");
}

export function isDailySearchStatsResponseBody(value: unknown): value is DailySearchStatsResponseBody {
  if (!isSuccessfulPayload(value)) {
    return false;
  }

  const candidate = value as { data?: unknown };
  if (!candidate.data || typeof candidate.data !== "object") {
    return false;
  }

  return Array.isArray((candidate.data as { days?: unknown }).days);
}

export function isContentQueriesResponseBody(value: unknown): value is ContentQueriesResponseBody {
  return isSuccessfulPayloadWithArray(value, "data");
}

export function isSegmentedTopStatsResponseBody(value: unknown): value is SegmentedTopStatsResponseBody {
  if (!isSuccessfulPayload(value)) {
    return false;
  }

  const candidate = value as { data?: unknown };
  if (!candidate.data || typeof candidate.data !== "object") {
    return false;
  }

  const segmentedTopData = candidate.data as {
    summaryRows?: unknown;
    rows?: unknown;
  };
  return Array.isArray(segmentedTopData.summaryRows) && Array.isArray(segmentedTopData.rows);
}

function isSuccessfulPayload(value: unknown): value is { success: true } {
  return !!value && typeof value === "object" && "success" in value && value.success === true;
}

function isSuccessfulPayloadWithArray<Key extends string>(
  value: unknown,
  key: Key,
): value is { success: true } & Record<Key, unknown[]> {
  if (!isSuccessfulPayload(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return Array.isArray(candidate[key]);
}

function sanitizeCacheScope(pathname: string): string {
  const normalizedPathname = pathname.replace(/^\/+/, "").replace(/[^a-z0-9]+/gi, "-");
  return normalizedPathname.replace(/^-+|-+$/g, "") || "root";
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), function formatHex(value) {
    return value.toString(16).padStart(2, "0");
  }).join("");
}
