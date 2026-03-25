import {
  ANALYTICS_SQLITE_TIME_MODIFIER,
  ANALYTICS_TIMEZONE_OFFSET_MS,
  ONE_DAY_IN_MS,
  ONE_WEEK_IN_DAYS,
  SEGMENTED_TOP_DAY_REFRESH_LOOKBACK_DAYS,
  SEGMENTED_TOP_DAY_RETENTION_DAYS,
  SEGMENTED_TOP_MONTH_RETENTION_MONTHS,
  SEGMENTED_TOP_WEEK_RETENTION_WEEKS,
  clampPositiveInteger,
  getAnalyticsDayStart,
  getAnalyticsMonthStart,
  getAnalyticsWeekStart,
  toDayBucket,
  toMonthBucket,
  type RefreshSegmentedTopSnapshotOptions,
} from "./search-analytics-common";

interface SegmentedRefreshContext {
  dayRefreshStartIso: string;
  dayRefreshStartBucket: string;
  weekRefreshStartBucket: string;
  monthRefreshStartBucket: string;
  dayRetentionBucket: string;
  weekRetentionBucket: string;
  monthRetentionBucket: string;
  updatedAt: string;
}

export async function refreshSegmentedTopDaySnapshot(
  db: D1Database,
  options?: RefreshSegmentedTopSnapshotOptions,
): Promise<void> {
  const context = createRefreshContext(options);
  await refreshDayGranularitySnapshots(db, context);
  await cleanupDayRetention(db, context);
}

export async function refreshSegmentedTopSnapshot(
  db: D1Database,
  options?: RefreshSegmentedTopSnapshotOptions,
): Promise<void> {
  const context = createRefreshContext(options);
  await refreshDayGranularitySnapshots(db, context);
  await refreshWeekMonthSnapshots(db, context);
  await cleanupAllRetention(db, context);
}

function createRefreshContext(options?: RefreshSegmentedTopSnapshotOptions): SegmentedRefreshContext {
  const now = options?.now ? new Date(options.now) : new Date();
  const dayRefreshLookbackDays = clampPositiveInteger(
    options?.dayRefreshLookbackDays,
    SEGMENTED_TOP_DAY_REFRESH_LOOKBACK_DAYS,
  );
  const dayRetentionDays = Math.max(
    dayRefreshLookbackDays,
    clampPositiveInteger(options?.dayRetentionDays, SEGMENTED_TOP_DAY_RETENTION_DAYS),
  );
  const weekRetentionWeeks = clampPositiveInteger(options?.weekRetentionWeeks, SEGMENTED_TOP_WEEK_RETENTION_WEEKS);
  const monthRetentionMonths = clampPositiveInteger(
    options?.monthRetentionMonths,
    SEGMENTED_TOP_MONTH_RETENTION_MONTHS,
  );

  const dayRefreshStart = getAnalyticsDayStart(new Date(now.getTime() - (dayRefreshLookbackDays - 1) * ONE_DAY_IN_MS));
  const weekRefreshStart = getAnalyticsWeekStart(dayRefreshStart);
  const monthRefreshStart = getAnalyticsMonthStart(dayRefreshStart);

  const dayRetentionStart = getAnalyticsDayStart(new Date(now.getTime() - (dayRetentionDays - 1) * ONE_DAY_IN_MS));
  const weekRetentionStart = new Date(
    getAnalyticsWeekStart(now).getTime() - (weekRetentionWeeks - 1) * ONE_WEEK_IN_DAYS * ONE_DAY_IN_MS,
  );
  const currentMonthStart = getAnalyticsMonthStart(now);
  const currentMonthStartInTimezone = new Date(currentMonthStart.getTime() + ANALYTICS_TIMEZONE_OFFSET_MS);
  const monthRetentionStart = new Date(
    Date.UTC(
      currentMonthStartInTimezone.getUTCFullYear(),
      currentMonthStartInTimezone.getUTCMonth() - (monthRetentionMonths - 1),
      1,
    ) - ANALYTICS_TIMEZONE_OFFSET_MS,
  );

  return {
    dayRefreshStartIso: dayRefreshStart.toISOString(),
    dayRefreshStartBucket: toDayBucket(dayRefreshStart),
    weekRefreshStartBucket: toDayBucket(weekRefreshStart),
    monthRefreshStartBucket: toMonthBucket(monthRefreshStart),
    dayRetentionBucket: toDayBucket(dayRetentionStart),
    weekRetentionBucket: toDayBucket(weekRetentionStart),
    monthRetentionBucket: toMonthBucket(monthRetentionStart),
    updatedAt: now.toISOString(),
  };
}

async function refreshDayGranularitySnapshots(db: D1Database, context: SegmentedRefreshContext): Promise<void> {
  await db
    .prepare("DELETE FROM periodic_hot_queries WHERE granularity = ? AND period_bucket >= ?")
    .bind("day", context.dayRefreshStartBucket)
    .run();
  await db
    .prepare(
      `INSERT INTO periodic_hot_queries (
         granularity,
         period_bucket,
         locale,
         query,
         hit_count,
         updated_at
       )
       SELECT
         'day' AS granularity,
         date(sh.requested_at, '${ANALYTICS_SQLITE_TIME_MODIFIER}') AS period_bucket,
         sh.locale,
         lower(trim(sh.query)) AS query,
         COUNT(*) AS hit_count,
         ? AS updated_at
       FROM search_history sh
       WHERE sh.requested_at >= ?
       GROUP BY period_bucket, sh.locale, lower(trim(sh.query))`,
    )
    .bind(context.updatedAt, context.dayRefreshStartIso)
    .run();

  await db
    .prepare("DELETE FROM periodic_hot_contents WHERE granularity = ? AND period_bucket >= ?")
    .bind("day", context.dayRefreshStartBucket)
    .run();
  await db
    .prepare(
      `INSERT INTO periodic_hot_contents (
         granularity,
         period_bucket,
         locale,
         content_id,
         content_title,
         hit_count,
         updated_at
       )
       SELECT
         'day' AS granularity,
         date(ch.clicked_at, '${ANALYTICS_SQLITE_TIME_MODIFIER}') AS period_bucket,
         ch.content_locale AS locale,
         ch.content_id,
         MAX(ch.content_title) AS content_title,
         COUNT(*) AS hit_count,
         ? AS updated_at
       FROM click_history ch
       WHERE ch.clicked_at >= ?
       GROUP BY period_bucket, ch.content_locale, ch.content_id`,
    )
    .bind(context.updatedAt, context.dayRefreshStartIso)
    .run();
}

async function refreshWeekMonthSnapshots(db: D1Database, context: SegmentedRefreshContext): Promise<void> {
  await db
    .prepare("DELETE FROM periodic_hot_queries WHERE granularity = ? AND period_bucket >= ?")
    .bind("week", context.weekRefreshStartBucket)
    .run();
  await db
    .prepare(
      `INSERT INTO periodic_hot_queries (
         granularity,
         period_bucket,
         locale,
         query,
         hit_count,
         updated_at
       )
       SELECT
         'week' AS granularity,
         date(day_stats.period_bucket, '-' || ((CAST(strftime('%w', day_stats.period_bucket) AS INTEGER) + 6) % 7) || ' days') AS period_bucket,
         day_stats.locale,
         day_stats.query,
         SUM(day_stats.hit_count) AS hit_count,
         ? AS updated_at
       FROM periodic_hot_queries day_stats
       WHERE day_stats.granularity = 'day'
         AND day_stats.period_bucket >= ?
       GROUP BY date(day_stats.period_bucket, '-' || ((CAST(strftime('%w', day_stats.period_bucket) AS INTEGER) + 6) % 7) || ' days'), day_stats.locale, day_stats.query`,
    )
    .bind(context.updatedAt, context.weekRefreshStartBucket)
    .run();

  await db
    .prepare("DELETE FROM periodic_hot_queries WHERE granularity = ? AND period_bucket >= ?")
    .bind("month", context.monthRefreshStartBucket)
    .run();
  await db
    .prepare(
      `INSERT INTO periodic_hot_queries (
         granularity,
         period_bucket,
         locale,
         query,
         hit_count,
         updated_at
       )
       SELECT
         'month' AS granularity,
         strftime('%Y-%m', day_stats.period_bucket) AS period_bucket,
         day_stats.locale,
         day_stats.query,
         SUM(day_stats.hit_count) AS hit_count,
         ? AS updated_at
       FROM periodic_hot_queries day_stats
       WHERE day_stats.granularity = 'day'
         AND day_stats.period_bucket >= ?
       GROUP BY strftime('%Y-%m', day_stats.period_bucket), day_stats.locale, day_stats.query`,
    )
    .bind(context.updatedAt, context.monthRefreshStartBucket)
    .run();

  await db
    .prepare("DELETE FROM periodic_hot_contents WHERE granularity = ? AND period_bucket >= ?")
    .bind("week", context.weekRefreshStartBucket)
    .run();
  await db
    .prepare(
      `INSERT INTO periodic_hot_contents (
         granularity,
         period_bucket,
         locale,
         content_id,
         content_title,
         hit_count,
         updated_at
       )
       SELECT
         'week' AS granularity,
         date(day_stats.period_bucket, '-' || ((CAST(strftime('%w', day_stats.period_bucket) AS INTEGER) + 6) % 7) || ' days') AS period_bucket,
         day_stats.locale,
         day_stats.content_id,
         MAX(day_stats.content_title) AS content_title,
         SUM(day_stats.hit_count) AS hit_count,
         ? AS updated_at
       FROM periodic_hot_contents day_stats
       WHERE day_stats.granularity = 'day'
         AND day_stats.period_bucket >= ?
       GROUP BY date(day_stats.period_bucket, '-' || ((CAST(strftime('%w', day_stats.period_bucket) AS INTEGER) + 6) % 7) || ' days'), day_stats.locale, day_stats.content_id`,
    )
    .bind(context.updatedAt, context.weekRefreshStartBucket)
    .run();

  await db
    .prepare("DELETE FROM periodic_hot_contents WHERE granularity = ? AND period_bucket >= ?")
    .bind("month", context.monthRefreshStartBucket)
    .run();
  await db
    .prepare(
      `INSERT INTO periodic_hot_contents (
         granularity,
         period_bucket,
         locale,
         content_id,
         content_title,
         hit_count,
         updated_at
       )
       SELECT
         'month' AS granularity,
         strftime('%Y-%m', day_stats.period_bucket) AS period_bucket,
         day_stats.locale,
         day_stats.content_id,
         MAX(day_stats.content_title) AS content_title,
         SUM(day_stats.hit_count) AS hit_count,
         ? AS updated_at
       FROM periodic_hot_contents day_stats
       WHERE day_stats.granularity = 'day'
         AND day_stats.period_bucket >= ?
       GROUP BY strftime('%Y-%m', day_stats.period_bucket), day_stats.locale, day_stats.content_id`,
    )
    .bind(context.updatedAt, context.monthRefreshStartBucket)
    .run();
}

async function cleanupDayRetention(db: D1Database, context: SegmentedRefreshContext): Promise<void> {
  await db
    .prepare("DELETE FROM periodic_hot_queries WHERE granularity = ? AND period_bucket < ?")
    .bind("day", context.dayRetentionBucket)
    .run();
  await db
    .prepare("DELETE FROM periodic_hot_contents WHERE granularity = ? AND period_bucket < ?")
    .bind("day", context.dayRetentionBucket)
    .run();
}

async function cleanupAllRetention(db: D1Database, context: SegmentedRefreshContext): Promise<void> {
  await cleanupDayRetention(db, context);

  await db
    .prepare("DELETE FROM periodic_hot_queries WHERE granularity = ? AND period_bucket < ?")
    .bind("week", context.weekRetentionBucket)
    .run();
  await db
    .prepare("DELETE FROM periodic_hot_queries WHERE granularity = ? AND period_bucket < ?")
    .bind("month", context.monthRetentionBucket)
    .run();

  await db
    .prepare("DELETE FROM periodic_hot_contents WHERE granularity = ? AND period_bucket < ?")
    .bind("week", context.weekRetentionBucket)
    .run();
  await db
    .prepare("DELETE FROM periodic_hot_contents WHERE granularity = ? AND period_bucket < ?")
    .bind("month", context.monthRetentionBucket)
    .run();
}
