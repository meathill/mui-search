import type {
  DailySearchStatItem,
  DailySearchStats,
  HotContentItem,
  HotQueryItem,
  SegmentedTopStatItem,
  SegmentedTopSummaryItem,
  SegmentedTopStats,
  StatsDimension,
  StatsGranularity,
} from "@mui-search/shared";
import { SUPPORTED_LOCALES } from "@mui-search/shared";

export type {
  DailySearchStatItem,
  DailySearchStats,
  HotContentItem,
  HotQueryItem,
  SegmentedTopStatItem,
  SegmentedTopSummaryItem,
  SegmentedTopStats,
  StatsDimension,
  StatsGranularity,
};

export const DEFAULT_LOCALE = "all";
export const DEFAULT_LOOKBACK_HOURS = 48;
export const DEFAULT_RETENTION_HOURS = 24 * 30;
export const ONE_HOUR_IN_MS = 60 * 60 * 1000;
export const ONE_DAY_IN_MS = 24 * ONE_HOUR_IN_MS;
export const ONE_WEEK_IN_DAYS = 7;
export const ANALYTICS_TIMEZONE = "Asia/Shanghai";
export const ANALYTICS_TIMEZONE_OFFSET_HOURS = 8;
export const ANALYTICS_TIMEZONE_OFFSET_MS = ANALYTICS_TIMEZONE_OFFSET_HOURS * ONE_HOUR_IN_MS;
export const ANALYTICS_SQLITE_TIME_MODIFIER = `+${ANALYTICS_TIMEZONE_OFFSET_HOURS} hours`;
export const DAILY_SEARCH_USERS_ESTIMATE_BASIS = "distinct_query" as const;
export const DEFAULT_SEGMENTED_TOP_LIMIT = 8;
export const SEGMENTED_TOP_DAY_REFRESH_LOOKBACK_DAYS = 3;
export const SEGMENTED_TOP_DAY_RETENTION_DAYS = 400;
export const SEGMENTED_TOP_WEEK_RETENTION_WEEKS = 80;
export const SEGMENTED_TOP_MONTH_RETENTION_MONTHS = 36;

export const DEFAULT_SEGMENTED_TOP_PERIODS: Record<StatsGranularity, number> = {
  day: 14,
  week: 12,
  month: 6,
};

export interface RefreshHotContentsOptions {
  now?: Date;
  lookbackHours?: number;
  retentionHours?: number;
}

export interface RefreshSegmentedTopSnapshotOptions {
  now?: Date;
  dayRefreshLookbackDays?: number;
  dayRetentionDays?: number;
  weekRetentionWeeks?: number;
  monthRetentionMonths?: number;
}

export interface HotContentRow {
  hour_bucket?: string;
  locale?: string;
  content_id?: string;
  content_title?: string;
  hit_count?: number;
}

export interface HotQueryRow {
  hour_bucket?: string;
  locale?: string;
  query?: string;
  hit_count?: number;
}

export interface DailySearchTotalRow {
  day_bucket?: string;
  search_count?: number;
  search_users_estimate?: number;
}

export interface DailySearchLocaleRow {
  day_bucket?: string;
  locale?: string;
  search_count?: number;
}

export interface SegmentedTopQueryRow {
  period_bucket?: string;
  locale?: string;
  dimension_value?: string;
  hit_count?: number;
}

export interface SegmentedTopContentRow {
  period_bucket?: string;
  locale?: string;
  content_id?: string;
  dimension_value?: string;
  hit_count?: number;
}

export interface SegmentedTopSummaryQueryRow {
  dimension_value?: string;
  hit_count?: number;
}

export interface SegmentedTopSummaryContentRow {
  content_id?: string;
  dimension_value?: string;
  hit_count?: number;
}

export function createEmptyDailySearchStats(days: number): DailySearchStatItem[] {
  const normalizedDays = clampPositiveInteger(days, 14);
  const startDate = getAnalyticsDayStart(new Date(Date.now() - (normalizedDays - 1) * ONE_DAY_IN_MS));
  return createDailyBuckets(startDate, normalizedDays).map(function toItem(day): DailySearchStatItem {
    return {
      day,
      searchCount: 0,
      searchUsersEstimate: 0,
      localeBreakdown: {},
    };
  });
}

export function clampPositiveInteger(value: number | undefined, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  const normalized = Math.floor(value);
  if (normalized <= 0) {
    return fallback;
  }

  return normalized;
}

const LOCALE_PATTERN = /^[a-z]{2}(?:-[a-z]{2})?$/;

const SUPPORTED_LOCALE_SET: ReadonlySet<string> = new Set(SUPPORTED_LOCALES);

export function normalizeLocale(input?: string): string {
  const value = input?.trim().toLowerCase();
  if (!value || value === DEFAULT_LOCALE) {
    return DEFAULT_LOCALE;
  }

  if (!LOCALE_PATTERN.test(value)) {
    return DEFAULT_LOCALE;
  }

  const languagePrefix = value.split("-")[0];
  if (!SUPPORTED_LOCALE_SET.has(languagePrefix)) {
    return DEFAULT_LOCALE;
  }

  return value;
}

export function toHourBucket(date: Date): string {
  const normalizedDate = new Date(date);
  normalizedDate.setUTCMinutes(0, 0, 0);
  return normalizedDate.toISOString();
}

export function resolvePeriodStartBucket(granularity: StatsGranularity, periods: number): string {
  const normalizedPeriods = clampPositiveInteger(periods, DEFAULT_SEGMENTED_TOP_PERIODS[granularity]);
  const now = new Date(Date.now());

  if (granularity === "day") {
    return toDayBucket(getAnalyticsDayStart(new Date(now.getTime() - (normalizedPeriods - 1) * ONE_DAY_IN_MS)));
  }

  if (granularity === "week") {
    const weekStart = getAnalyticsWeekStart(now);
    return toDayBucket(new Date(weekStart.getTime() - (normalizedPeriods - 1) * ONE_WEEK_IN_DAYS * ONE_DAY_IN_MS));
  }

  const monthStart = getAnalyticsMonthStart(now);
  const monthStartInTimezone = shiftDateToAnalyticsTimezone(monthStart);
  return toMonthBucket(
    new Date(
      Date.UTC(monthStartInTimezone.getUTCFullYear(), monthStartInTimezone.getUTCMonth() - (normalizedPeriods - 1), 1) -
        ANALYTICS_TIMEZONE_OFFSET_MS,
    ),
  );
}

export function getAnalyticsDayStart(date: Date): Date {
  const normalizedDate = shiftDateToAnalyticsTimezone(date);
  normalizedDate.setUTCHours(0, 0, 0, 0);
  return shiftDateFromAnalyticsTimezone(normalizedDate);
}

export function getAnalyticsWeekStart(date: Date): Date {
  const dayStart = getAnalyticsDayStart(date);
  const dayStartInTimezone = shiftDateToAnalyticsTimezone(dayStart);
  const weekDay = dayStartInTimezone.getUTCDay();
  const offset = (weekDay + 6) % 7;
  dayStart.setUTCDate(dayStart.getUTCDate() - offset);
  return dayStart;
}

export function getAnalyticsMonthStart(date: Date): Date {
  const normalizedDate = shiftDateToAnalyticsTimezone(date);
  return new Date(
    Date.UTC(normalizedDate.getUTCFullYear(), normalizedDate.getUTCMonth(), 1) - ANALYTICS_TIMEZONE_OFFSET_MS,
  );
}

export function createDailyBuckets(startDate: Date, days: number): string[] {
  return Array.from({ length: days }, function buildDayBucket(_, index) {
    return toDayBucket(new Date(startDate.getTime() + index * ONE_DAY_IN_MS));
  });
}

export function toDayBucket(date: Date): string {
  return shiftDateToAnalyticsTimezone(date).toISOString().slice(0, 10);
}

export function toMonthBucket(date: Date): string {
  return shiftDateToAnalyticsTimezone(date).toISOString().slice(0, 7);
}

function shiftDateToAnalyticsTimezone(date: Date): Date {
  return new Date(date.getTime() + ANALYTICS_TIMEZONE_OFFSET_MS);
}

function shiftDateFromAnalyticsTimezone(date: Date): Date {
  return new Date(date.getTime() - ANALYTICS_TIMEZONE_OFFSET_MS);
}
