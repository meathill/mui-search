import type { ContentQueryItem } from "@mui-search/shared";
import type { ClickEventRecord, SearchEventRecord } from "../types";
import {
  DAILY_SEARCH_USERS_ESTIMATE_BASIS,
  DEFAULT_SEGMENTED_TOP_LIMIT,
  DEFAULT_SEGMENTED_TOP_PERIODS,
  clampPositiveInteger,
  createEmptyDailySearchStats,
  normalizeLocale,
  type DailySearchStats,
  type HotContentItem,
  type HotQueryItem,
  type RefreshHotContentsOptions,
  type RefreshSegmentedTopSnapshotOptions,
  type SegmentedTopStats,
  type StatsDimension,
  type StatsGranularity,
} from "./search-analytics-common";
import { createHourlyDailyHandlers } from "./search-analytics-hourly";
import { createSegmentedHandlers } from "./search-analytics-segmented";

interface SearchAnalyticsService {
  recordSearch(event: SearchEventRecord): Promise<void>;
  recordClick(event: ClickEventRecord): Promise<void>;
  refreshHourlyHotContentsSnapshot(options?: RefreshHotContentsOptions): Promise<void>;
  refreshSegmentedTopDaySnapshot(options?: RefreshSegmentedTopSnapshotOptions): Promise<void>;
  refreshSegmentedTopSnapshot(options?: RefreshSegmentedTopSnapshotOptions): Promise<void>;
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

export function createSearchAnalyticsService(database?: D1Database): SearchAnalyticsService {
  if (!database) {
    return {
      async recordSearch(): Promise<void> {
        return;
      },
      async recordClick(): Promise<void> {
        return;
      },
      async refreshHourlyHotContentsSnapshot(): Promise<void> {
        return;
      },
      async refreshSegmentedTopDaySnapshot(): Promise<void> {
        return;
      },
      async refreshSegmentedTopSnapshot(): Promise<void> {
        return;
      },
      async queryHourlyHotContents(): Promise<HotContentItem[]> {
        return [];
      },
      async queryHourlyHotQueries(): Promise<HotQueryItem[]> {
        return [];
      },
      async queryDailySearchStats(days: number): Promise<DailySearchStats> {
        return {
          days: createEmptyDailySearchStats(days),
          locales: [],
          searchUsersEstimateBasis: DAILY_SEARCH_USERS_ESTIMATE_BASIS,
        };
      },
      async querySegmentedTopStats(
        granularity: StatsGranularity,
        dimension: StatsDimension,
        periods: number,
        limit: number,
        locale?: string,
      ): Promise<SegmentedTopStats> {
        return {
          granularity,
          dimension,
          periods: clampPositiveInteger(periods, DEFAULT_SEGMENTED_TOP_PERIODS[granularity]),
          limit: clampPositiveInteger(limit, DEFAULT_SEGMENTED_TOP_LIMIT),
          localeFilter: normalizeLocale(locale),
          locales: [],
          summaryRows: [],
          rows: [],
        };
      },
      async queryContentQueries(): Promise<ContentQueryItem[]> {
        return [];
      },
    };
  }

  const hourlyDailyHandlers = createHourlyDailyHandlers(database);
  const segmentedHandlers = createSegmentedHandlers(database);

  return {
    recordSearch: hourlyDailyHandlers.recordSearch,
    recordClick: hourlyDailyHandlers.recordClick,
    refreshHourlyHotContentsSnapshot: hourlyDailyHandlers.refreshHourlyHotContentsSnapshot,
    refreshSegmentedTopDaySnapshot: segmentedHandlers.refreshSegmentedTopDaySnapshot,
    refreshSegmentedTopSnapshot: segmentedHandlers.refreshSegmentedTopSnapshot,
    queryHourlyHotContents: hourlyDailyHandlers.queryHourlyHotContents,
    queryHourlyHotQueries: hourlyDailyHandlers.queryHourlyHotQueries,
    queryDailySearchStats: hourlyDailyHandlers.queryDailySearchStats,
    querySegmentedTopStats: segmentedHandlers.querySegmentedTopStats,
    queryContentQueries: segmentedHandlers.queryContentQueries,
  };
}
