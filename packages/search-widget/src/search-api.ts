import {
  type ClickResponseBody,
  type HotQueriesResponseBody,
  type HotResponseBody,
  SEARCH_QUERY_MIN_LENGTH,
  type SearchResponseBody,
  type SuggestResponseBody,
} from "@mui-search/shared";
import { isRecord, readResponseBody } from "@mui-search/shared";
import {
  DEFAULT_HOT_HOURS,
  DEFAULT_HOT_LIMIT,
  DEFAULT_LOCALE,
  DEFAULT_REQUEST_TIMEOUT_MS,
  DEFAULT_SEARCH_LIMIT,
  DEFAULT_SUGGEST_LIMIT,
} from "./constants";
import type { SearchApi, SearchParams, SuggestParams, TrackClickParams } from "./types";

interface CreateSearchApiOptions {
  apiBaseUrl: string;
  requestTimeoutMs?: number;
  fetchImpl?: typeof fetch;
}

interface RequestResult<TPayload> {
  payload: TPayload;
}

export function createSearchApi(options: CreateSearchApiOptions): SearchApi {
  const apiBaseUrl = normalizeApiBaseUrl(options.apiBaseUrl);
  const requestTimeoutMs = parsePositiveInt(options.requestTimeoutMs, DEFAULT_REQUEST_TIMEOUT_MS, 1, 60_000);
  const fetchImpl = options.fetchImpl ?? fetch;

  return {
    apiBaseUrl,
    async suggest(params: SuggestParams) {
      const query = normalizeQuery(params.query);
      if (!query) {
        return [];
      }

      const limit = parsePositiveInt(params.limit, DEFAULT_SUGGEST_LIMIT, 1, 20);
      const locale = normalizeLocale(params.locale);

      const endpoint = new URL(`${apiBaseUrl}/api/suggest`);
      endpoint.searchParams.set("q", query);
      endpoint.searchParams.set("limit", String(limit));
      endpoint.searchParams.set("locale", locale);

      const response = await fetchJson<SuggestResponseBody>(
        fetchImpl,
        endpoint.toString(),
        {
          method: "GET",
        },
        requestTimeoutMs,
      );

      if (!response.payload.success) {
        return [];
      }

      if (!Array.isArray(response.payload.suggestions)) {
        throw new Error("补全接口返回格式错误：缺少 suggestions");
      }

      return response.payload.suggestions;
    },

    async search(params: SearchParams) {
      const query = normalizeQuery(params.query);
      if (!query) {
        return [];
      }
      if (query.length < SEARCH_QUERY_MIN_LENGTH) {
        throw new Error(`关键词长度不足（至少 ${SEARCH_QUERY_MIN_LENGTH} 个字符）`);
      }

      const limit = parsePositiveInt(params.limit, DEFAULT_SEARCH_LIMIT, 1, 20);
      const locale = normalizeLocale(params.locale);

      const endpoint = new URL(`${apiBaseUrl}/api/search`);
      endpoint.searchParams.set("q", query);
      endpoint.searchParams.set("limit", String(limit));
      endpoint.searchParams.set("locale", locale);

      const response = await fetchJson<SearchResponseBody>(
        fetchImpl,
        endpoint.toString(),
        {
          method: "GET",
        },
        requestTimeoutMs,
      );

      if (!response.payload.success) {
        return [];
      }

      if (!Array.isArray(response.payload.data)) {
        throw new Error("搜索接口返回格式错误：缺少 data");
      }

      return response.payload.data;
    },

    async hot(params) {
      const locale = normalizeLocale(params.locale);
      const limit = parsePositiveInt(params.limit, DEFAULT_HOT_LIMIT, 1, 20);
      const hours = parsePositiveInt(params.hours, DEFAULT_HOT_HOURS, 1, 168);

      const endpoint = new URL(`${apiBaseUrl}/api/hot`);
      endpoint.searchParams.set("locale", locale);
      endpoint.searchParams.set("limit", String(limit));
      endpoint.searchParams.set("hours", String(hours));

      const response = await fetchJson<HotResponseBody>(
        fetchImpl,
        endpoint.toString(),
        {
          method: "GET",
        },
        requestTimeoutMs,
      );

      if (!response.payload.success) {
        return [];
      }

      if (!Array.isArray(response.payload.data)) {
        throw new Error("热榜接口返回格式错误：缺少 data");
      }

      return response.payload.data;
    },

    async hotQueries(params) {
      const locale = normalizeLocale(params.locale);
      const limit = parsePositiveInt(params.limit, DEFAULT_HOT_LIMIT, 1, 20);
      const hours = parsePositiveInt(params.hours, DEFAULT_HOT_HOURS, 1, 168);

      const endpoint = new URL(`${apiBaseUrl}/api/hot-queries`);
      endpoint.searchParams.set("locale", locale);
      endpoint.searchParams.set("limit", String(limit));
      endpoint.searchParams.set("hours", String(hours));

      const response = await fetchJson<HotQueriesResponseBody>(
        fetchImpl,
        endpoint.toString(),
        {
          method: "GET",
        },
        requestTimeoutMs,
      );

      if (!response.payload.success) {
        return [];
      }

      if (!Array.isArray(response.payload.data)) {
        throw new Error("热搜词接口返回格式错误：缺少 data");
      }

      return response.payload.data;
    },

    async trackClick(params: TrackClickParams) {
      const query = normalizeQuery(params.query);
      if (!query) {
        return;
      }

      const body: Record<string, unknown> = {
        query,
        locale: normalizeLocale(params.locale),
        contentId: params.contentId,
        contentTitle: params.contentTitle,
      };
      const contentLocale = params.contentLocale?.trim();
      if (contentLocale) {
        body.contentLocale = contentLocale;
      }

      const response = await fetchJson<ClickResponseBody>(
        fetchImpl,
        `${apiBaseUrl}/api/click`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify(body),
        },
        requestTimeoutMs,
      );

      if (!response.payload.success) {
        throw new Error("点击上报失败：服务端返回 success=false");
      }
    },
  };
}

export function normalizeApiBaseUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("缺少 apiBaseUrl");
  }

  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
}

function normalizeQuery(value: string): string {
  return value.trim();
}

function normalizeLocale(value: string | undefined): string {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) {
    return DEFAULT_LOCALE;
  }

  return normalized;
}

function parsePositiveInt(rawValue: number | undefined, fallback: number, min: number, max: number): number {
  if (rawValue === undefined) {
    return fallback;
  }

  const integerValue = Math.trunc(rawValue);
  if (!Number.isFinite(integerValue)) {
    return fallback;
  }

  if (integerValue < min) {
    return min;
  }
  if (integerValue > max) {
    return max;
  }

  return integerValue;
}

async function fetchJson<TPayload>(
  fetchImpl: typeof fetch,
  url: string,
  requestInit: RequestInit,
  timeoutMs: number,
): Promise<RequestResult<TPayload>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(function abortByTimeout() {
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetchImpl(url, {
      ...requestInit,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw buildHttpStatusError(response.status);
    }

    let rawPayload: unknown;
    try {
      rawPayload = await readResponseBody(response);
    } catch {
      throw new Error("接口返回格式错误，请稍后再试");
    }

    if (!isRecord(rawPayload)) {
      throw new Error("接口返回格式错误：不是 JSON 对象");
    }

    return {
      payload: rawPayload as TPayload,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("请求超时，请稍后重试");
    }

    if (error instanceof TypeError) {
      throw new Error("网络异常，请检查网络后重试");
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function buildHttpStatusError(status: number): Error {
  if (status === 400) {
    return new Error("请求参数不合法，请检查输入后重试");
  }
  if (status === 401 || status === 403) {
    return new Error("当前请求未被允许，请稍后再试");
  }
  if (status === 404) {
    return new Error("接口不可用，请联系管理员");
  }
  if (status >= 500) {
    return new Error("服务暂时不可用，请稍后重试");
  }

  return new Error(`请求失败（HTTP ${status}）`);
}
