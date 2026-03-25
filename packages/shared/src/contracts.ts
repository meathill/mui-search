export const SEARCH_QUERY_MIN_LENGTH = 2;

export interface SuggestionItem {
  id: string;
  text: string;
  locale?: string;
}

export interface HybridSearchResult {
  id: string;
  slug?: string;
  title: string;
  content: string;
  score: number;
  locale?: string;
  url?: string;
}

export interface HotContentItem {
  hourBucket: string;
  locale: string;
  contentId: string;
  contentTitle: string;
  hitCount: number;
  contentUrl?: string;
}

export interface HotQueryItem {
  hourBucket: string;
  locale: string;
  query: string;
  hitCount: number;
}

export interface SearchRequestBody {
  query: string;
  limit?: number;
  locale?: string;
}

export interface ClickRequestBody {
  query: string;
  locale?: string;
  contentId: string;
  contentTitle: string;
  contentLocale?: string;
}

export interface SuggestResponseBody {
  success: boolean;
  suggestions: SuggestionItem[];
}

export interface SearchResponseBody {
  success: boolean;
  data: HybridSearchResult[];
}

export interface HotResponseBody {
  success: boolean;
  data: HotContentItem[];
}

export interface HotQueriesResponseBody {
  success: boolean;
  data: HotQueryItem[];
}

export interface ClickResponseBody {
  success: boolean;
}

export interface DailySearchStatItem {
  day: string;
  searchCount: number;
  searchUsersEstimate: number;
  localeBreakdown: Record<string, number>;
}

export interface DailySearchStats {
  days: DailySearchStatItem[];
  locales: string[];
  searchUsersEstimateBasis: "distinct_query";
}

export interface DailySearchStatsResponseBody {
  success: boolean;
  data: DailySearchStats;
}

export type StatsGranularity = "day" | "week" | "month";
export type StatsDimension = "query" | "content";

export interface SegmentedTopStatItem {
  periodBucket: string;
  locale: string;
  dimensionValue: string;
  hitCount: number;
  contentId?: string;
}

export interface SegmentedTopSummaryItem {
  dimensionValue: string;
  hitCount: number;
  contentId?: string;
}

export interface SegmentedTopStats {
  granularity: StatsGranularity;
  dimension: StatsDimension;
  periods: number;
  limit: number;
  localeFilter: string;
  locales: string[];
  summaryRows: SegmentedTopSummaryItem[];
  localeSummaryRows?: SegmentedTopLocaleSummaryItem[];
  rows: SegmentedTopStatItem[];
}

export interface SegmentedTopStatsResponseBody {
  success: boolean;
  data: SegmentedTopStats;
}

export interface SegmentedTopLocaleSummaryItem {
  dimensionValue: string;
  locale: string;
  hitCount: number;
}

export interface ContentQueryItem {
  query: string;
  clickCount: number;
}

export interface ContentQueriesResponseBody {
  success: boolean;
  data: ContentQueryItem[];
}
