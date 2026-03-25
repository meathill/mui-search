import type {
  ContentQueryItem,
  DailySearchStats,
  HotContentItem,
  HotQueryItem,
  HybridSearchResult,
  SegmentedTopStats,
  SuggestionItem,
  StatsDimension,
  StatsGranularity,
} from "@mui-search/shared";

export type {
  DailySearchStats,
  HotContentItem,
  HotQueryItem,
  HybridSearchResult,
  SegmentedTopStats,
  SuggestionItem,
  StatsDimension,
  StatsGranularity,
};

type GeneratedWorkerEnv = Env;

export interface RankedDocument {
  id: string;
  slug?: string;
  title: string;
  content: string;
  locale?: string;
}

export interface ResponseCache {
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<void>;
}

export interface ApiDataCache {
  get<T>(key: string, validator: (value: unknown) => value is T): Promise<T | null>;
  put(key: string, responseBody: unknown, ttlSeconds: number): Promise<void>;
}

export interface SearchEventRecord {
  query: string;
  locale: string;
  resultCount: number;
}

export interface ClickEventRecord {
  query: string;
  locale: string;
  contentId: string;
  contentTitle: string;
  contentLocale: string;
}

export interface AppDependencies {
  maxSuggestPerRequest: number;
  maxSearchPerRequest: number;
  maxHotPerRequest: number;
  maxSegmentedTopPerRequest: number;
  responseCache?: ResponseCache;
  apiDataCache?: ApiDataCache;
  hotContentSourceUrl?: string;
  hotContentOrigin?: string;
  querySuggestions(query: string, limit: number, locale?: string): Promise<SuggestionItem[]>;
  queryHybridSearch(query: string, limit: number, locale?: string): Promise<HybridSearchResult[]>;
  recordSearchEvent(event: SearchEventRecord): Promise<void>;
  recordClickEvent(event: ClickEventRecord): Promise<void>;
  queryHourlyHotContents(hours: number, limit: number, locale?: string): Promise<HotContentItem[]>;
  queryHourlyHotQueries(hours: number, limit: number, locale?: string): Promise<HotQueryItem[]>;
  queryDailySearchStats(days: number, locale?: string): Promise<DailySearchStats>;
  querySegmentedTopStats(
    granularity: StatsGranularity,
    dimension: StatsDimension,
    periods: number,
    limit: number,
    locale?: string,
  ): Promise<SegmentedTopStats>;
  queryContentQueries(contentId: string, days: number, limit: number): Promise<ContentQueryItem[]>;
}

export interface WorkerEnv extends Omit<GeneratedWorkerEnv, "TIDB_TABLE_NAME" | "ASSETS" | "DB" | "BUCKET" | "KV"> {
  ASSETS: Fetcher;
  KV?: KVNamespace;
  TIDB_DATABASE_URL: string;
  TIDB_TABLE_NAME?: string;
  HOT_AGGREGATION_LOOKBACK_HOURS?: string;
  ANALYTICS_RETENTION_HOURS?: string;
  HOT_CONTENT_SOURCE_URL?: string;
  HOT_CONTENT_ORIGIN?: string;
  API_SECRET_KEY?: string;
  DB?: D1Database;
}

export interface TiDBRepository {
  querySuggestions(query: string, limit: number, locale?: string): Promise<SuggestionItem[]>;
  queryKeywordMatches(query: string, limit: number, locale?: string): Promise<RankedDocument[]>;
  queryVectorMatches(query: string, limit: number, locale?: string): Promise<RankedDocument[]>;
}
