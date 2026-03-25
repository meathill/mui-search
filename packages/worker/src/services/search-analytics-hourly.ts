import type { ClickEventRecord, SearchEventRecord } from "../types";
import {
  ANALYTICS_SQLITE_TIME_MODIFIER,
  DAILY_SEARCH_USERS_ESTIMATE_BASIS,
  DEFAULT_LOOKBACK_HOURS,
  DEFAULT_LOCALE,
  DEFAULT_RETENTION_HOURS,
  ONE_DAY_IN_MS,
  ONE_HOUR_IN_MS,
  clampPositiveInteger,
  createDailyBuckets,
  getAnalyticsDayStart,
  normalizeLocale,
  toHourBucket,
  type DailySearchLocaleRow,
  type DailySearchStats,
  type DailySearchTotalRow,
  type HotContentItem,
  type HotContentRow,
  type HotQueryItem,
  type HotQueryRow,
  type RefreshHotContentsOptions,
} from "./search-analytics-common";

export interface HourlyDailyHandlers {
  recordSearch(event: SearchEventRecord): Promise<void>;
  recordClick(event: ClickEventRecord): Promise<void>;
  refreshHourlyHotContentsSnapshot(options?: RefreshHotContentsOptions): Promise<void>;
  queryHourlyHotContents(hours: number, limit: number, locale?: string): Promise<HotContentItem[]>;
  queryHourlyHotQueries(hours: number, limit: number, locale?: string): Promise<HotQueryItem[]>;
  queryDailySearchStats(days: number, locale?: string): Promise<DailySearchStats>;
}

export function createHourlyDailyHandlers(db: D1Database): HourlyDailyHandlers {
  return {
    async recordSearch(event: SearchEventRecord): Promise<void> {
      const now = new Date();
      const hourBucket = toHourBucket(now);
      const queryLocale = normalizeLocale(event.locale);
      const requestedAt = now.toISOString();

      await db
        .prepare(
          `INSERT INTO search_history (
             query,
             locale,
             result_count,
             top_result_id,
             top_result_title,
             top_result_locale,
             requested_at,
             hour_bucket
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(event.query, queryLocale, event.resultCount, null, null, queryLocale, requestedAt, hourBucket)
        .run();
    },

    async recordClick(event: ClickEventRecord): Promise<void> {
      const now = new Date();
      const hourBucket = toHourBucket(now);
      const queryLocale = normalizeLocale(event.locale);
      const contentLocale = normalizeLocale(event.contentLocale || queryLocale);
      const clickedAt = now.toISOString();

      await db
        .prepare(
          `INSERT INTO click_history (
             query,
             locale,
             content_id,
             content_title,
             content_locale,
             clicked_at,
             hour_bucket
           ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(event.query, queryLocale, event.contentId, event.contentTitle, contentLocale, clickedAt, hourBucket)
        .run();
    },

    async refreshHourlyHotContentsSnapshot(options?: RefreshHotContentsOptions): Promise<void> {
      const now = options?.now ? new Date(options.now) : new Date();
      const lookbackHours = clampPositiveInteger(options?.lookbackHours, DEFAULT_LOOKBACK_HOURS);
      const retentionHours = Math.max(
        lookbackHours,
        clampPositiveInteger(options?.retentionHours, DEFAULT_RETENTION_HOURS),
      );

      const startBucket = toHourBucket(new Date(now.getTime() - (lookbackHours - 1) * ONE_HOUR_IN_MS));
      const retentionBucket = toHourBucket(new Date(now.getTime() - (retentionHours - 1) * ONE_HOUR_IN_MS));
      const updatedAt = now.toISOString();

      await db.prepare("DELETE FROM hourly_hot_contents WHERE hour_bucket >= ?").bind(startBucket).run();
      await db.prepare("DELETE FROM hourly_hot_queries WHERE hour_bucket >= ?").bind(startBucket).run();

      await db
        .prepare(
          `INSERT INTO hourly_hot_contents (
             hour_bucket,
             locale,
             content_id,
             content_title,
             hit_count,
             updated_at
           )
           SELECT
             ch.hour_bucket,
             ch.content_locale,
             ch.content_id,
             MAX(ch.content_title) AS content_title,
             COUNT(*) AS hit_count,
             ? AS updated_at
           FROM click_history ch
           WHERE ch.hour_bucket >= ?
           GROUP BY ch.hour_bucket, ch.content_locale, ch.content_id`,
        )
        .bind(updatedAt, startBucket)
        .run();

      await db
        .prepare(
          `INSERT INTO hourly_hot_queries (
             hour_bucket,
             locale,
             query,
             hit_count,
             updated_at
           )
           SELECT
             sh.hour_bucket,
             sh.locale,
             lower(trim(sh.query)) AS query,
             COUNT(*) AS hit_count,
             ? AS updated_at
           FROM search_history sh
           WHERE sh.hour_bucket >= ?
           GROUP BY sh.hour_bucket, sh.locale, lower(trim(sh.query))`,
        )
        .bind(updatedAt, startBucket)
        .run();

      await db.prepare("DELETE FROM search_history WHERE hour_bucket < ?").bind(retentionBucket).run();
      await db.prepare("DELETE FROM click_history WHERE hour_bucket < ?").bind(retentionBucket).run();
      await db.prepare("DELETE FROM hourly_hot_contents WHERE hour_bucket < ?").bind(retentionBucket).run();
      await db.prepare("DELETE FROM hourly_hot_queries WHERE hour_bucket < ?").bind(retentionBucket).run();
    },

    async queryHourlyHotContents(hours: number, limit: number, locale?: string): Promise<HotContentItem[]> {
      const normalizedLocale = normalizeLocale(locale);
      const startBucket = toHourBucket(new Date(Date.now() - (hours - 1) * ONE_HOUR_IN_MS));

      const result = await db
        .prepare(
          `SELECT
             hour_bucket,
             locale,
             content_id,
             content_title,
             hit_count
           FROM hourly_hot_contents
           WHERE hour_bucket >= ?
             AND (? = ? OR locale = ?)
           ORDER BY hour_bucket DESC, hit_count DESC, content_id ASC
           LIMIT ?`,
        )
        .bind(startBucket, normalizedLocale, DEFAULT_LOCALE, normalizedLocale, limit)
        .all<HotContentRow>();

      const rows = Array.isArray(result.results) ? result.results : [];
      return rows
        .filter(function isValidRow(row): row is Required<HotContentRow> {
          return (
            typeof row.hour_bucket === "string" &&
            typeof row.locale === "string" &&
            typeof row.content_id === "string" &&
            typeof row.content_title === "string" &&
            typeof row.hit_count === "number"
          );
        })
        .map(function toHotItem(row): HotContentItem {
          return {
            hourBucket: row.hour_bucket,
            locale: row.locale,
            contentId: row.content_id,
            contentTitle: row.content_title,
            hitCount: row.hit_count,
          };
        });
    },

    async queryHourlyHotQueries(hours: number, limit: number, locale?: string): Promise<HotQueryItem[]> {
      const normalizedLocale = normalizeLocale(locale);
      const startBucket = toHourBucket(new Date(Date.now() - (hours - 1) * ONE_HOUR_IN_MS));

      const result = await db
        .prepare(
          `SELECT
             hour_bucket,
             locale,
             query,
             hit_count
           FROM hourly_hot_queries
           WHERE hour_bucket >= ?
             AND (? = ? OR locale = ?)
           ORDER BY hour_bucket DESC, hit_count DESC, query ASC
           LIMIT ?`,
        )
        .bind(startBucket, normalizedLocale, DEFAULT_LOCALE, normalizedLocale, limit)
        .all<HotQueryRow>();

      const rows = Array.isArray(result.results) ? result.results : [];
      return rows
        .filter(function isValidRow(row): row is Required<HotQueryRow> {
          return (
            typeof row.hour_bucket === "string" &&
            typeof row.locale === "string" &&
            typeof row.query === "string" &&
            typeof row.hit_count === "number"
          );
        })
        .map(function toHotQuery(row): HotQueryItem {
          return {
            hourBucket: row.hour_bucket,
            locale: row.locale,
            query: row.query,
            hitCount: row.hit_count,
          };
        });
    },

    async queryDailySearchStats(days: number, locale?: string): Promise<DailySearchStats> {
      const normalizedLocale = normalizeLocale(locale);
      const lookbackDays = clampPositiveInteger(days, 14);
      const startDate = getAnalyticsDayStart(new Date(Date.now() - (lookbackDays - 1) * ONE_DAY_IN_MS));
      const startDateIso = startDate.toISOString();

      const dailyTotalResult = await db
        .prepare(
          `SELECT
             date(requested_at, '${ANALYTICS_SQLITE_TIME_MODIFIER}') AS day_bucket,
             COUNT(*) AS search_count,
             COUNT(DISTINCT lower(trim(query))) AS search_users_estimate
           FROM search_history
           WHERE requested_at >= ?
             AND (? = ? OR locale = ?)
           GROUP BY day_bucket
           ORDER BY day_bucket ASC`,
        )
        .bind(startDateIso, normalizedLocale, DEFAULT_LOCALE, normalizedLocale)
        .all<DailySearchTotalRow>();

      const localeDistributionResult = await db
        .prepare(
          `SELECT
             date(requested_at, '${ANALYTICS_SQLITE_TIME_MODIFIER}') AS day_bucket,
             locale,
             COUNT(*) AS search_count
           FROM search_history
           WHERE requested_at >= ?
             AND (? = ? OR locale = ?)
           GROUP BY day_bucket, locale
           ORDER BY day_bucket ASC, search_count DESC, locale ASC`,
        )
        .bind(startDateIso, normalizedLocale, DEFAULT_LOCALE, normalizedLocale)
        .all<DailySearchLocaleRow>();

      const statsByDay = new Map<string, DailySearchStats["days"][number]>();
      const localeTotals = new Map<string, number>();

      for (const day of createDailyBuckets(startDate, lookbackDays)) {
        statsByDay.set(day, {
          day,
          searchCount: 0,
          searchUsersEstimate: 0,
          localeBreakdown: {},
        });
      }

      const totalRows = Array.isArray(dailyTotalResult.results) ? dailyTotalResult.results : [];
      for (const row of totalRows) {
        if (
          typeof row.day_bucket !== "string" ||
          typeof row.search_count !== "number" ||
          typeof row.search_users_estimate !== "number"
        ) {
          continue;
        }

        const target = statsByDay.get(row.day_bucket);
        if (!target) {
          continue;
        }

        target.searchCount = row.search_count;
        target.searchUsersEstimate = row.search_users_estimate;
      }

      const localeRows = Array.isArray(localeDistributionResult.results) ? localeDistributionResult.results : [];
      for (const row of localeRows) {
        if (
          typeof row.day_bucket !== "string" ||
          typeof row.locale !== "string" ||
          typeof row.search_count !== "number"
        ) {
          continue;
        }

        const target = statsByDay.get(row.day_bucket);
        if (!target) {
          continue;
        }

        target.localeBreakdown[row.locale] = row.search_count;
        localeTotals.set(row.locale, (localeTotals.get(row.locale) ?? 0) + row.search_count);
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
        days: Array.from(statsByDay.values()),
        locales,
        searchUsersEstimateBasis: DAILY_SEARCH_USERS_ESTIMATE_BASIS,
      };
    },
  };
}
