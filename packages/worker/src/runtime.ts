import { createHybridSearchService } from "./services/hybrid-search";
import { createSearchAnalyticsService } from "./services/search-analytics";
import { createApiDataKvCache } from "./api-data-cache";
import { createTiDBRepository } from "./services/tidb-repository";
import type { AppDependencies, WorkerEnv } from "./types";

const DEFAULT_TABLE_NAME = "documents";

export function createRuntimeDependencies(env: WorkerEnv): AppDependencies {
  const repository = createTiDBRepository({
    databaseUrl: env.TIDB_DATABASE_URL,
    tableName: env.TIDB_TABLE_NAME ?? DEFAULT_TABLE_NAME,
  });
  const hybridSearchService = createHybridSearchService({
    repository,
  });
  const analyticsService = createSearchAnalyticsService(env.DB);
  const responseCache = resolveResponseCache();
  const apiDataCache = resolveApiDataCache(env);

  return {
    maxSuggestPerRequest: 8,
    maxSearchPerRequest: 10,
    maxHotPerRequest: 20,
    maxSegmentedTopPerRequest: 100,
    ...(responseCache ? { responseCache } : {}),
    ...(apiDataCache ? { apiDataCache } : {}),
    ...(env.HOT_CONTENT_SOURCE_URL ? { hotContentSourceUrl: env.HOT_CONTENT_SOURCE_URL } : {}),
    ...(env.HOT_CONTENT_ORIGIN ? { hotContentOrigin: env.HOT_CONTENT_ORIGIN } : {}),
    querySuggestions: repository.querySuggestions,
    queryHybridSearch: hybridSearchService.queryHybridSearch,
    recordSearchEvent: analyticsService.recordSearch,
    recordClickEvent: analyticsService.recordClick,
    queryHourlyHotContents: analyticsService.queryHourlyHotContents,
    queryHourlyHotQueries: analyticsService.queryHourlyHotQueries,
    queryDailySearchStats: analyticsService.queryDailySearchStats,
    querySegmentedTopStats: analyticsService.querySegmentedTopStats,
    queryContentQueries: analyticsService.queryContentQueries,
  };
}

function resolveResponseCache(): AppDependencies["responseCache"] {
  if (typeof caches === "undefined") {
    return undefined;
  }

  const cacheStorage = caches as CacheStorage & {
    default?: Cache;
  };

  return cacheStorage.default;
}

function resolveApiDataCache(env: WorkerEnv): AppDependencies["apiDataCache"] {
  if (!env.KV) {
    return undefined;
  }

  return createApiDataKvCache(env.KV);
}
