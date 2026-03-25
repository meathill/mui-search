import type { ContentQueryItem, SegmentedTopLocaleSummaryItem } from "@mui-search/shared";
import { fetchWithTimer, isRecord, readablePayload } from "./requests/client-utils";
import {
  normalizeDimensionValue,
  normalizeGranularityValue,
  normalizeNonNegativeInteger,
  parseSegmentedTopLimitValue,
  parseTopPeriodsInput,
  type DailySearchStatItem,
  type DailySearchStats,
  type SegmentedTopStats,
  type SegmentedTopStatsRequest,
} from "./stats-state";
import { aggregateSegmentedTopRows, sortSegmentedTopRows, sortSegmentedTopSummaryRows } from "@mui-search/shared";

export async function fetchDailySearchStats(
  apiBaseUrl: string,
  days: number,
  locale: string,
): Promise<DailySearchStats> {
  const params = new URLSearchParams();
  params.set("days", String(days));
  params.set("locale", locale);

  const url = `${apiBaseUrl}/api/stats/daily-search?${params.toString()}`;
  const result = await fetchWithTimer(url, {
    method: "GET",
  });

  const payload = result.payload;
  if (!isRecord(payload) || payload.success !== true || !isRecord(payload.data)) {
    throw new Error(`Invalid analytics response payload: ${readablePayload(payload)}`);
  }

  return normalizeDailySearchStats(payload.data);
}

export async function fetchSegmentedTopStats(
  apiBaseUrl: string,
  request: SegmentedTopStatsRequest,
): Promise<SegmentedTopStats> {
  const params = new URLSearchParams();
  params.set("granularity", request.granularity);
  params.set("dimension", request.dimension);
  params.set("periods", String(request.periods));
  params.set("limit", String(request.limit));
  params.set("locale", request.locale);

  const url = `${apiBaseUrl}/api/stats/segmented-top?${params.toString()}`;
  const result = await fetchWithTimer(url, {
    method: "GET",
  });

  const payload = result.payload;
  if (!isRecord(payload) || payload.success !== true || !isRecord(payload.data)) {
    throw new Error(`Invalid segmented top response payload: ${readablePayload(payload)}`);
  }

  return normalizeSegmentedTopStats(payload.data, request);
}

export async function fetchContentQueries(
  apiBaseUrl: string,
  contentId: string,
  days: number,
  limit: number,
): Promise<ContentQueryItem[]> {
  const params = new URLSearchParams();
  params.set("contentId", contentId);
  params.set("days", String(days));
  params.set("limit", String(limit));

  const url = `${apiBaseUrl}/api/stats/content-queries?${params.toString()}`;
  const result = await fetchWithTimer(url, {
    method: "GET",
  });

  const payload = result.payload;
  if (!isRecord(payload) || payload.success !== true || !Array.isArray(payload.data)) {
    throw new Error(`Invalid content queries response payload: ${readablePayload(payload)}`);
  }

  return (payload.data as unknown[])
    .filter(function isValid(item): item is { query: string; clickCount: number } {
      return isRecord(item) && typeof item.query === "string" && typeof item.clickCount === "number";
    })
    .map(function toItem(item) {
      return {
        query: item.query,
        clickCount: normalizeNonNegativeInteger(item.clickCount),
      };
    });
}

function normalizeDailySearchStats(data: unknown): DailySearchStats {
  const source = isRecord(data) ? data : {};
  const normalizedDays = Array.isArray(source.days)
    ? source.days
        .map(function toDay(item) {
          if (!isRecord(item)) {
            return undefined;
          }

          const localeBreakdown = isRecord(item.localeBreakdown)
            ? Object.fromEntries(
                Object.entries(item.localeBreakdown)
                  .filter(function isNumberEntry(entry): entry is [string, number] {
                    const value = entry[1];
                    return typeof value === "number" && Number.isFinite(value) && value >= 0;
                  })
                  .map(function toEntry([key, value]) {
                    return [key, Math.round(value)] as const;
                  }),
              )
            : {};

          return {
            day: typeof item.day === "string" ? item.day : "",
            searchCount: normalizeNonNegativeInteger(item.searchCount),
            searchUsersEstimate: normalizeNonNegativeInteger(item.searchUsersEstimate),
            localeBreakdown,
          } satisfies DailySearchStatItem;
        })
        .filter(function isDay(item): item is DailySearchStatItem {
          return Boolean(item?.day);
        })
    : [];

  const normalizedLocales = Array.isArray(source.locales)
    ? source.locales.filter(function isLocale(item): item is string {
        return typeof item === "string" && item.length > 0;
      })
    : [];

  return {
    days: normalizedDays,
    locales: normalizedLocales,
    searchUsersEstimateBasis:
      source.searchUsersEstimateBasis === "distinct_query" ? "distinct_query" : "distinct_query",
  };
}

function normalizeSegmentedTopStats(data: unknown, request: SegmentedTopStatsRequest): SegmentedTopStats {
  const source = isRecord(data) ? data : {};
  const granularity = normalizeGranularityValue(
    typeof source.granularity === "string" ? source.granularity : request.granularity,
  );
  const dimension = normalizeDimensionValue(
    typeof source.dimension === "string" ? source.dimension : request.dimension,
  );
  const periods = parseTopPeriodsInput(String(source.periods ?? request.periods), granularity);
  const limit = parseSegmentedTopLimitValue(String(source.limit ?? request.limit));
  const localeFilter = typeof source.localeFilter === "string" ? source.localeFilter : request.locale;

  const rows: SegmentedTopStats["rows"] = [];
  if (Array.isArray(source.rows)) {
    for (const item of source.rows) {
      if (!isRecord(item)) {
        continue;
      }

      const periodBucket = typeof item.periodBucket === "string" ? item.periodBucket : "";
      const locale = typeof item.locale === "string" ? item.locale : "";
      const dimensionValue = typeof item.dimensionValue === "string" ? item.dimensionValue : "";
      const hitCount = normalizeNonNegativeInteger(item.hitCount);
      const contentId = typeof item.contentId === "string" ? item.contentId : undefined;

      if (!periodBucket || !locale || !dimensionValue) {
        continue;
      }

      const normalizedRow: SegmentedTopStats["rows"][number] = {
        periodBucket,
        locale,
        dimensionValue,
        hitCount,
      };

      if (contentId) {
        normalizedRow.contentId = contentId;
      }

      rows.push(normalizedRow);
    }
  }

  const summaryRows: SegmentedTopStats["summaryRows"] = [];
  if (Array.isArray(source.summaryRows)) {
    for (const item of source.summaryRows) {
      if (!isRecord(item)) {
        continue;
      }

      const dimensionValue = typeof item.dimensionValue === "string" ? item.dimensionValue : "";
      const hitCount = normalizeNonNegativeInteger(item.hitCount);
      const contentId = typeof item.contentId === "string" ? item.contentId : undefined;

      if (!dimensionValue) {
        continue;
      }

      const normalizedRow: SegmentedTopStats["summaryRows"][number] = {
        dimensionValue,
        hitCount,
      };

      if (contentId) {
        normalizedRow.contentId = contentId;
      }

      summaryRows.push(normalizedRow);
    }
  }

  const locales = Array.isArray(source.locales)
    ? source.locales.filter(function isLocale(item): item is string {
        return typeof item === "string" && item.length > 0;
      })
    : Array.from(
        new Set(
          rows.map(function toLocale(item) {
            return item.locale;
          }),
        ),
      );

  const localeSummaryRows: SegmentedTopLocaleSummaryItem[] = [];
  if (Array.isArray(source.localeSummaryRows)) {
    for (const item of source.localeSummaryRows) {
      if (!isRecord(item)) {
        continue;
      }

      const dimensionValue = typeof item.dimensionValue === "string" ? item.dimensionValue : "";
      const locale = typeof item.locale === "string" ? item.locale : "";
      const hitCount = normalizeNonNegativeInteger(item.hitCount);

      if (dimensionValue && locale) {
        localeSummaryRows.push({ dimensionValue, locale, hitCount });
      }
    }
  }

  return {
    granularity,
    dimension,
    periods,
    limit,
    localeFilter,
    locales,
    summaryRows:
      summaryRows.length > 0
        ? sortSegmentedTopSummaryRows(summaryRows)
        : aggregateSegmentedTopRows(rows, dimension, limit),
    ...(localeSummaryRows.length > 0 ? { localeSummaryRows } : {}),
    rows: sortSegmentedTopRows(rows),
  };
}
