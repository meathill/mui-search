import { vi } from "vitest";

import type { DailySearchStats, HotContentItem, HotQueryItem, SegmentedTopStats } from "@mui-search/shared";
import { buildApiDataCacheKey } from "../src/api-data-cache";
import type {
  ApiDataCache,
  AppDependencies,
  ClickEventRecord,
  HybridSearchResult,
  ResponseCache,
  SearchEventRecord,
  SuggestionItem,
} from "../src/types";

export function buildDependencies(overrides: Partial<AppDependencies> = {}): AppDependencies {
  const suggestions: SuggestionItem[] = [{ id: "1", text: "TiDB 分布式数据库" }];
  const searchResults: HybridSearchResult[] = [
    { id: "101", title: "TiDB Cloud", content: "支持向量检索", score: 0.032, locale: "zh" },
  ];
  const hotContents: HotContentItem[] = [
    {
      hourBucket: "2026-02-27T09:00:00.000Z",
      locale: "zh",
      contentId: "101",
      contentTitle: "TiDB Cloud",
      hitCount: 3,
    },
  ];
  const hotQueries: HotQueryItem[] = [
    {
      hourBucket: "2026-02-27T09:00:00.000Z",
      locale: "zh",
      query: "tidb",
      hitCount: 5,
    },
  ];
  const dailyStats: DailySearchStats = {
    days: [
      {
        day: "2026-02-27",
        searchCount: 10,
        searchUsersEstimate: 6,
        localeBreakdown: {
          zh: 7,
          en: 3,
        },
      },
    ],
    locales: ["zh", "en"],
    searchUsersEstimateBasis: "distinct_query",
  };
  const segmentedTopStats: SegmentedTopStats = {
    granularity: "day",
    dimension: "query",
    periods: 14,
    limit: 8,
    localeFilter: "all",
    locales: ["zh", "en"],
    summaryRows: [
      {
        dimensionValue: "how smart are you",
        hitCount: 12,
      },
    ],
    rows: [
      {
        periodBucket: "2026-02-27",
        locale: "zh",
        dimensionValue: "how smart are you",
        hitCount: 12,
      },
    ],
  };

  return {
    maxSuggestPerRequest: 8,
    maxSearchPerRequest: 10,
    maxHotPerRequest: 20,
    maxSegmentedTopPerRequest: 100,
    hotContentSourceUrl: "https://hub.example.com/{locale}/ga4-top100.json",
    hotContentOrigin: "https://www.example.com",
    querySuggestions: vi.fn(async () => suggestions),
    queryHybridSearch: vi.fn(async () => searchResults),
    recordSearchEvent: vi.fn(async (_event: SearchEventRecord) => {}),
    recordClickEvent: vi.fn(async (_event: ClickEventRecord) => {}),
    queryHourlyHotContents: vi.fn(async () => hotContents),
    queryHourlyHotQueries: vi.fn(async () => hotQueries),
    queryDailySearchStats: vi.fn(async () => dailyStats),
    querySegmentedTopStats: vi.fn(async () => segmentedTopStats),
    queryContentQueries: vi.fn(async () => []),
    ...overrides,
  };
}

export function createMockResponseCache(): {
  cache: ResponseCache;
  match: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  prime(request: Request, response: Response): Promise<void>;
} {
  const store = new Map<string, Response>();
  const match = vi.fn(async (request: Request) => {
    const cached = store.get(request.url);
    return cached?.clone();
  });
  const put = vi.fn(async (request: Request, response: Response) => {
    store.set(request.url, response.clone());
  });

  return {
    cache: {
      match,
      put,
    },
    match,
    put,
    async prime(request: Request, response: Response) {
      store.set(request.url, response.clone());
    },
  };
}

export function createMockApiDataCache(): {
  cache: ApiDataCache;
  get: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  prime(key: string, responseBody: unknown): void;
  primeRequest(request: Request, responseBody: unknown): Promise<void>;
} {
  const store = new Map<string, unknown>();
  const get = vi.fn(async <T>(key: string, validator: (value: unknown) => value is T) => {
    const cached = store.get(key);
    return validator(cached) ? structuredClone(cached) : null;
  });
  const put = vi.fn(async (key: string, responseBody: unknown, _ttlSeconds: number) => {
    store.set(key, structuredClone(responseBody));
  });
  async function getFromCache<T>(key: string, validator: (value: unknown) => value is T): Promise<T | null> {
    return get(key, validator) as Promise<T | null>;
  }

  async function putIntoCache(key: string, responseBody: unknown, ttlSeconds: number): Promise<void> {
    await put(key, responseBody, ttlSeconds);
  }

  return {
    cache: {
      get: getFromCache,
      put: putIntoCache,
    },
    get,
    put,
    prime(key, responseBody) {
      store.set(key, structuredClone(responseBody));
    },
    async primeRequest(request, responseBody) {
      const key = await buildApiDataCacheKey(request);
      store.set(key, structuredClone(responseBody));
    },
  };
}

export function buildCachedJsonResponse(body: unknown, cacheControl: string): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": cacheControl,
      "access-control-allow-origin": "*",
    },
  });
}
