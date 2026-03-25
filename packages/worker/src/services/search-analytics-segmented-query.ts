import type { ContentQueryItem, SegmentedTopLocaleSummaryItem } from "@mui-search/shared";
import {
  DEFAULT_LOCALE,
  DEFAULT_SEGMENTED_TOP_LIMIT,
  DEFAULT_SEGMENTED_TOP_PERIODS,
  clampPositiveInteger,
  normalizeLocale,
  resolvePeriodStartBucket,
  type SegmentedTopQueryRow,
  type SegmentedTopStatItem,
  type SegmentedTopSummaryItem,
  type SegmentedTopSummaryQueryRow,
  type SegmentedTopStats,
  type StatsDimension,
  type StatsGranularity,
} from "./search-analytics-common";
import {
  queryContentQueries,
  querySegmentedTopContentDetails,
  querySegmentedTopContentSummary,
} from "./search-analytics-segmented-content";
import { sortSegmentedTopRows, sortSegmentedTopSummaryRows } from "@mui-search/shared";

export { queryContentQueries } from "./search-analytics-segmented-content";

const DAY_QUERY_SEGMENTED_DETAIL_MAX_ROWS = 100;

export async function querySegmentedTopStats(
  db: D1Database,
  granularity: StatsGranularity,
  dimension: StatsDimension,
  periods: number,
  limit: number,
  locale?: string,
): Promise<SegmentedTopStats> {
  const normalizedLocale = normalizeLocale(locale);
  const normalizedPeriods = clampPositiveInteger(periods, DEFAULT_SEGMENTED_TOP_PERIODS[granularity]);
  const normalizedLimit = clampPositiveInteger(limit, DEFAULT_SEGMENTED_TOP_LIMIT);
  const periodStartBucket = resolvePeriodStartBucket(granularity, normalizedPeriods);

  let rows: SegmentedTopStatItem[] = [];
  let summaryRows: SegmentedTopSummaryItem[] = [];
  let localeSummaryRows: SegmentedTopLocaleSummaryItem[] | undefined;
  if (dimension === "query") {
    rows = await querySegmentedTopQueryDetails(db, granularity, periodStartBucket, normalizedLocale, normalizedLimit);
    summaryRows = await querySegmentedTopQuerySummary(
      db,
      granularity,
      periodStartBucket,
      normalizedLocale,
      normalizedLimit,
    );
    localeSummaryRows = await querySegmentedTopQueryLocaleSummary(
      db,
      granularity,
      periodStartBucket,
      normalizedLocale,
      normalizedLimit,
    );
  } else {
    rows = await querySegmentedTopContentDetails(db, granularity, periodStartBucket, normalizedLocale, normalizedLimit);
    summaryRows = await querySegmentedTopContentSummary(
      db,
      granularity,
      periodStartBucket,
      normalizedLocale,
      normalizedLimit,
    );
  }

  rows = sortSegmentedTopRows(rows);
  summaryRows = sortSegmentedTopSummaryRows(summaryRows);

  if (dimension === "query" && granularity === "day") {
    rows = rows.slice(0, DAY_QUERY_SEGMENTED_DETAIL_MAX_ROWS);
  }

  const localeTotals = new Map<string, number>();
  for (const row of rows) {
    localeTotals.set(row.locale, (localeTotals.get(row.locale) ?? 0) + row.hitCount);
  }

  const locales = Array.from(localeTotals.entries())
    .sort(function byTotalDescThenLocaleAsc([localeA, totalA], [localeB, totalB]) {
      if (totalA === totalB) {
        return localeA.localeCompare(localeB);
      }
      return totalB - totalA;
    })
    .map(function toLocale([localeKey]) {
      return localeKey;
    });

  return {
    granularity,
    dimension,
    periods: normalizedPeriods,
    limit: normalizedLimit,
    localeFilter: normalizedLocale,
    locales,
    summaryRows,
    ...(localeSummaryRows && localeSummaryRows.length > 0 ? { localeSummaryRows } : {}),
    rows,
  };
}

async function querySegmentedTopQueryDetails(
  db: D1Database,
  granularity: StatsGranularity,
  periodStartBucket: string,
  normalizedLocale: string,
  normalizedLimit: number,
): Promise<SegmentedTopStatItem[]> {
  const result = await db
    .prepare(
      `WITH ranked AS (
         SELECT
           period_bucket,
           locale,
           query AS dimension_value,
           hit_count,
           ROW_NUMBER() OVER (
             PARTITION BY period_bucket, locale
             ORDER BY hit_count DESC, query ASC
           ) AS row_number
         FROM periodic_hot_queries
         WHERE granularity = ?
           AND period_bucket >= ?
           AND (? = ? OR locale = ?)
       )
       SELECT
         period_bucket,
         locale,
         dimension_value,
         hit_count
       FROM ranked
       WHERE row_number <= ?
       ORDER BY period_bucket DESC, hit_count DESC, locale ASC, dimension_value ASC`,
    )
    .bind(granularity, periodStartBucket, normalizedLocale, DEFAULT_LOCALE, normalizedLocale, normalizedLimit)
    .all<SegmentedTopQueryRow>();

  const queryRows = Array.isArray(result.results) ? result.results : [];
  return queryRows
    .filter(function isValidQueryRow(row): row is Required<SegmentedTopQueryRow> {
      return (
        typeof row.period_bucket === "string" &&
        typeof row.locale === "string" &&
        typeof row.dimension_value === "string" &&
        typeof row.hit_count === "number"
      );
    })
    .map(function toSegmentedTopRow(row): SegmentedTopStatItem {
      return {
        periodBucket: row.period_bucket,
        locale: row.locale,
        dimensionValue: row.dimension_value,
        hitCount: row.hit_count,
      };
    });
}

async function querySegmentedTopQuerySummary(
  db: D1Database,
  granularity: StatsGranularity,
  periodStartBucket: string,
  normalizedLocale: string,
  normalizedLimit: number,
): Promise<SegmentedTopSummaryItem[]> {
  const result = await db
    .prepare(
      `SELECT
         query AS dimension_value,
         SUM(hit_count) AS hit_count
       FROM periodic_hot_queries
       WHERE granularity = ?
         AND period_bucket >= ?
         AND (? = ? OR locale = ?)
       GROUP BY query
       ORDER BY hit_count DESC, dimension_value ASC
       LIMIT ?`,
    )
    .bind(granularity, periodStartBucket, normalizedLocale, DEFAULT_LOCALE, normalizedLocale, normalizedLimit)
    .all<SegmentedTopSummaryQueryRow>();

  const summaryRows = Array.isArray(result.results) ? result.results : [];
  return summaryRows
    .filter(function isValidSummaryRow(row): row is Required<SegmentedTopSummaryQueryRow> {
      return typeof row.dimension_value === "string" && typeof row.hit_count === "number";
    })
    .map(function toSummaryRow(row): SegmentedTopSummaryItem {
      return {
        dimensionValue: row.dimension_value,
        hitCount: row.hit_count,
      };
    });
}

interface LocaleSummaryQueryRow {
  dimension_value?: string;
  locale?: string;
  hit_count?: number;
}

async function querySegmentedTopQueryLocaleSummary(
  db: D1Database,
  granularity: StatsGranularity,
  periodStartBucket: string,
  normalizedLocale: string,
  normalizedLimit: number,
): Promise<SegmentedTopLocaleSummaryItem[]> {
  const result = await db
    .prepare(
      `SELECT
         query AS dimension_value,
         locale,
         SUM(hit_count) AS hit_count
       FROM periodic_hot_queries
       WHERE granularity = ?
         AND period_bucket >= ?
         AND (? = ? OR locale = ?)
         AND query IN (
           SELECT query
           FROM periodic_hot_queries
           WHERE granularity = ?
             AND period_bucket >= ?
             AND (? = ? OR locale = ?)
           GROUP BY query
           ORDER BY SUM(hit_count) DESC, query ASC
           LIMIT ?
         )
       GROUP BY query, locale
       ORDER BY hit_count DESC, dimension_value ASC, locale ASC`,
    )
    .bind(
      granularity,
      periodStartBucket,
      normalizedLocale,
      DEFAULT_LOCALE,
      normalizedLocale,
      granularity,
      periodStartBucket,
      normalizedLocale,
      DEFAULT_LOCALE,
      normalizedLocale,
      normalizedLimit,
    )
    .all<LocaleSummaryQueryRow>();

  const rows = Array.isArray(result.results) ? result.results : [];
  return rows
    .filter(function isValid(row): row is Required<LocaleSummaryQueryRow> {
      return (
        typeof row.dimension_value === "string" && typeof row.locale === "string" && typeof row.hit_count === "number"
      );
    })
    .map(function toLocaleSummaryRow(row): SegmentedTopLocaleSummaryItem {
      return {
        dimensionValue: row.dimension_value,
        locale: row.locale,
        hitCount: row.hit_count,
      };
    });
}
