import type { ContentQueryItem } from "@mui-search/shared";
import {
  ANALYTICS_TIMEZONE_OFFSET_MS,
  DEFAULT_LOCALE,
  ONE_DAY_IN_MS,
  clampPositiveInteger,
  type SegmentedTopContentRow,
  type SegmentedTopStatItem,
  type SegmentedTopSummaryContentRow,
  type SegmentedTopSummaryItem,
  type StatsGranularity,
} from "./search-analytics-common";

export async function querySegmentedTopContentDetails(
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
           content_id,
           content_title AS dimension_value,
           hit_count,
           ROW_NUMBER() OVER (
             PARTITION BY period_bucket, locale
             ORDER BY hit_count DESC, content_title ASC, content_id ASC
           ) AS row_number
         FROM periodic_hot_contents
         WHERE granularity = ?
           AND period_bucket >= ?
           AND (? = ? OR locale = ?)
       )
       SELECT
         period_bucket,
         locale,
         content_id,
         dimension_value,
         hit_count
       FROM ranked
       WHERE row_number <= ?
       ORDER BY period_bucket DESC, hit_count DESC, locale ASC, dimension_value ASC, content_id ASC`,
    )
    .bind(granularity, periodStartBucket, normalizedLocale, DEFAULT_LOCALE, normalizedLocale, normalizedLimit)
    .all<SegmentedTopContentRow>();

  const contentRows = Array.isArray(result.results) ? result.results : [];
  return contentRows
    .filter(function isValidContentRow(row): row is Required<SegmentedTopContentRow> {
      return (
        typeof row.period_bucket === "string" &&
        typeof row.locale === "string" &&
        typeof row.content_id === "string" &&
        typeof row.dimension_value === "string" &&
        typeof row.hit_count === "number"
      );
    })
    .map(function toSegmentedTopRow(row): SegmentedTopStatItem {
      return {
        periodBucket: row.period_bucket,
        locale: row.locale,
        contentId: row.content_id,
        dimensionValue: row.dimension_value,
        hitCount: row.hit_count,
      };
    });
}

export async function querySegmentedTopContentSummary(
  db: D1Database,
  granularity: StatsGranularity,
  periodStartBucket: string,
  normalizedLocale: string,
  normalizedLimit: number,
): Promise<SegmentedTopSummaryItem[]> {
  const result = await db
    .prepare(
      `SELECT
         content_id,
         content_title AS dimension_value,
         SUM(hit_count) AS hit_count
       FROM periodic_hot_contents
       WHERE granularity = ?
         AND period_bucket >= ?
         AND (? = ? OR locale = ?)
       GROUP BY content_id, content_title
       ORDER BY hit_count DESC, dimension_value ASC, content_id ASC
       LIMIT ?`,
    )
    .bind(granularity, periodStartBucket, normalizedLocale, DEFAULT_LOCALE, normalizedLocale, normalizedLimit)
    .all<SegmentedTopSummaryContentRow>();

  const summaryRows = Array.isArray(result.results) ? result.results : [];
  return summaryRows
    .filter(function isValidSummaryRow(row): row is Required<SegmentedTopSummaryContentRow> {
      return (
        typeof row.content_id === "string" &&
        typeof row.dimension_value === "string" &&
        typeof row.hit_count === "number"
      );
    })
    .map(function toSummaryRow(row): SegmentedTopSummaryItem {
      return {
        contentId: row.content_id,
        dimensionValue: row.dimension_value,
        hitCount: row.hit_count,
      };
    });
}

interface ContentQueryRow {
  query?: string;
  click_count?: number;
}

export async function queryContentQueries(
  db: D1Database,
  contentId: string,
  days: number,
  limit: number,
): Promise<ContentQueryItem[]> {
  const normalizedDays = clampPositiveInteger(days, 30);
  const normalizedLimit = clampPositiveInteger(limit, 20);
  const cutoffDate = new Date(Date.now() + ANALYTICS_TIMEZONE_OFFSET_MS - normalizedDays * ONE_DAY_IN_MS);
  cutoffDate.setUTCHours(0, 0, 0, 0);
  const cutoffIso = new Date(cutoffDate.getTime() - ANALYTICS_TIMEZONE_OFFSET_MS).toISOString();

  const result = await db
    .prepare(
      `SELECT
         query,
         COUNT(*) AS click_count
       FROM click_history
       WHERE content_id = ?
         AND clicked_at >= ?
       GROUP BY query
       ORDER BY click_count DESC, query ASC
       LIMIT ?`,
    )
    .bind(contentId, cutoffIso, normalizedLimit)
    .all<ContentQueryRow>();

  const rows = Array.isArray(result.results) ? result.results : [];
  return rows
    .filter(function isValid(row): row is Required<ContentQueryRow> {
      return typeof row.query === "string" && typeof row.click_count === "number";
    })
    .map(function toContentQueryItem(row): ContentQueryItem {
      return {
        query: row.query,
        clickCount: row.click_count,
      };
    });
}
