import type { ContentQueryItem } from "@mui-search/shared";
import type {
  RefreshSegmentedTopSnapshotOptions,
  SegmentedTopStats,
  StatsDimension,
  StatsGranularity,
} from "./search-analytics-common";
import { queryContentQueries, querySegmentedTopStats } from "./search-analytics-segmented-query";
import { refreshSegmentedTopDaySnapshot, refreshSegmentedTopSnapshot } from "./search-analytics-segmented-refresh";

export interface SegmentedHandlers {
  refreshSegmentedTopDaySnapshot(options?: RefreshSegmentedTopSnapshotOptions): Promise<void>;
  refreshSegmentedTopSnapshot(options?: RefreshSegmentedTopSnapshotOptions): Promise<void>;
  querySegmentedTopStats(
    granularity: StatsGranularity,
    dimension: StatsDimension,
    periods: number,
    limit: number,
    locale?: string,
  ): Promise<SegmentedTopStats>;
  queryContentQueries(contentId: string, days: number, limit: number): Promise<ContentQueryItem[]>;
}

export function createSegmentedHandlers(db: D1Database): SegmentedHandlers {
  return {
    async refreshSegmentedTopDaySnapshot(options?: RefreshSegmentedTopSnapshotOptions): Promise<void> {
      await refreshSegmentedTopDaySnapshot(db, options);
    },

    async refreshSegmentedTopSnapshot(options?: RefreshSegmentedTopSnapshotOptions): Promise<void> {
      await refreshSegmentedTopSnapshot(db, options);
    },

    async querySegmentedTopStats(
      granularity: StatsGranularity,
      dimension: StatsDimension,
      periods: number,
      limit: number,
      locale?: string,
    ): Promise<SegmentedTopStats> {
      return querySegmentedTopStats(db, granularity, dimension, periods, limit, locale);
    },

    async queryContentQueries(contentId: string, days: number, limit: number): Promise<ContentQueryItem[]> {
      return queryContentQueries(db, contentId, days, limit);
    },
  };
}
