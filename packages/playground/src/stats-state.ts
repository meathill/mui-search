import type {
  DailySearchStatItem,
  DailySearchStats,
  SegmentedTopStats,
  StatsDimension,
  StatsGranularity,
} from "@mui-search/shared";

export const DEFAULT_API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? resolveDefaultApiBaseUrl();
export const DEFAULT_DAILY_DAYS = 14;
const DEFAULT_TODAY_DAYS = 1;
const MAX_DAILY_DAYS = 90;
const DEFAULT_TOP_GRANULARITY: StatsGranularity = "day";
const DEFAULT_TOP_DIMENSION: StatsDimension = "query";
export const SEGMENTED_TOP_REQUEST_LIMIT = 100;
const MAX_SEGMENTED_TOP_LIMIT = 100;
export const DEFAULT_TOP_PERIODS: Record<StatsGranularity, number> = {
  day: 14,
  week: 12,
  month: 6,
};
const MAX_TOP_PERIODS: Record<StatsGranularity, number> = {
  day: 180,
  week: 52,
  month: 24,
};

export const NUMBER_FORMATTER = new Intl.NumberFormat("en-US");

export interface StatsView {
  dailyDaysInput: HTMLInputElement;
  localeSelect: HTMLSelectElement;
  topGranularitySelect: HTMLSelectElement;
  topDimensionSelect: HTMLSelectElement;
  statusText: HTMLParagraphElement;
  refreshButton: HTMLButtonElement;
  summaryTotalSearch: HTMLParagraphElement;
  summaryDailyAverage: HTMLParagraphElement;
  summaryLatestSearch: HTMLParagraphElement;
  summaryLatestUsers: HTMLParagraphElement;
  estimateBasis: HTMLParagraphElement;
  chartContainer: HTMLDivElement;
  localePieContainer: HTMLDivElement;
  segmentedChartContainer: HTMLDivElement;
  segmentedTitle: HTMLHeadingElement;
  segmentedBucketHeader: HTMLTableCellElement;
  segmentedValueHeader: HTMLTableCellElement;
  segmentedIdHeader: HTMLTableCellElement;
  segmentedBody: HTMLTableSectionElement;
  segmentedEmpty: HTMLParagraphElement;
}

export interface StatsRequestState {
  apiBaseUrl: string;
  dailyDays: number;
  filteredDailyDays: number;
  locale: string;
  topGranularity: StatsGranularity;
  topDimension: StatsDimension;
  statsScope: StatsScope;
}

export interface SegmentedTopStatsRequest {
  granularity: StatsGranularity;
  dimension: StatsDimension;
  periods: number;
  limit: number;
  locale: string;
}

export type StatsScope = "today" | "filtered";

export function createDefaultStatsState(): StatsRequestState {
  return {
    apiBaseUrl: DEFAULT_API_BASE_URL,
    dailyDays: DEFAULT_TODAY_DAYS,
    filteredDailyDays: DEFAULT_DAILY_DAYS,
    locale: "all",
    topGranularity: DEFAULT_TOP_GRANULARITY,
    topDimension: DEFAULT_TOP_DIMENSION,
    statsScope: "today",
  };
}

function resolveDefaultApiBaseUrl(): string {
  if (typeof window === "undefined" || !window.location?.origin) {
    return "";
  }

  return window.location.origin;
}

export function parseDailyDaysInput(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) {
    return DEFAULT_DAILY_DAYS;
  }

  if (parsed < 1) {
    return 1;
  }

  if (parsed > MAX_DAILY_DAYS) {
    return MAX_DAILY_DAYS;
  }

  return parsed;
}

export function parseTopPeriodsInput(value: string, granularity: StatsGranularity): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) {
    return DEFAULT_TOP_PERIODS[granularity];
  }

  if (parsed < 1) {
    return 1;
  }

  const maxPeriods = MAX_TOP_PERIODS[granularity];
  if (parsed > maxPeriods) {
    return maxPeriods;
  }

  return parsed;
}

export function parseSegmentedTopLimitValue(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) {
    return SEGMENTED_TOP_REQUEST_LIMIT;
  }

  if (parsed < 1) {
    return 1;
  }

  if (parsed > MAX_SEGMENTED_TOP_LIMIT) {
    return MAX_SEGMENTED_TOP_LIMIT;
  }

  return parsed;
}

export function normalizeLocaleValue(value: string): string {
  const normalized = value.trim().toLowerCase();
  return normalized || "all";
}

export function normalizeGranularityValue(value: string): StatsGranularity {
  const normalized = value.trim().toLowerCase();
  if (normalized === "week") {
    return "week";
  }

  if (normalized === "month") {
    return "month";
  }

  return "day";
}

export function normalizeDimensionValue(value: string): StatsDimension {
  const normalized = value.trim().toLowerCase();
  if (normalized === "content") {
    return "content";
  }

  return "query";
}

export function formatGranularityLabel(granularity: StatsGranularity): string {
  if (granularity === "week") {
    return "Weekly";
  }

  if (granularity === "month") {
    return "Monthly";
  }

  return "Daily";
}

export function formatDimensionLabel(dimension: StatsDimension): string {
  if (dimension === "content") {
    return "Content Page";
  }

  return "Query";
}

export function formatSegmentedTopScopeLabel(granularity: StatsGranularity, periods: number): string {
  const normalizedPeriods = Math.max(1, Math.floor(periods));

  if (granularity === "day") {
    return normalizedPeriods === 1 ? "Today" : `Last ${normalizedPeriods} days`;
  }

  if (granularity === "week") {
    return normalizedPeriods === 1 ? "This week" : `Last ${normalizedPeriods} weeks`;
  }

  return normalizedPeriods === 1 ? "This month" : `Last ${normalizedPeriods} months`;
}

export function formatBucketHeader(granularity: StatsGranularity): string {
  if (granularity === "week") {
    return "Week Start";
  }

  if (granularity === "month") {
    return "Month";
  }

  return "Date";
}

export function normalizeNonNegativeInteger(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return 0;
  }
  return Math.round(value);
}

export function buildSegmentedTopRequest(state: StatsRequestState): SegmentedTopStatsRequest {
  const periods = resolveAggregatedSegmentedTopPeriods(state);

  return {
    granularity: state.topGranularity,
    dimension: state.topDimension,
    periods,
    limit: SEGMENTED_TOP_REQUEST_LIMIT,
    locale: state.locale,
  };
}

export function activateFilteredStatsScope(state: StatsRequestState): void {
  if (state.statsScope === "filtered") {
    return;
  }

  state.statsScope = "filtered";
  state.dailyDays = state.filteredDailyDays;
}

function resolveAggregatedSegmentedTopPeriods(state: Pick<StatsRequestState, "dailyDays" | "topGranularity">): number {
  let periods = state.dailyDays;
  if (state.topGranularity === "week") {
    periods = Math.ceil(state.dailyDays / 7);
  } else if (state.topGranularity === "month") {
    periods = Math.ceil(state.dailyDays / 30);
  }

  const maxPeriods = MAX_TOP_PERIODS[state.topGranularity];
  return Math.min(maxPeriods, Math.max(1, periods));
}

export type { DailySearchStatItem, DailySearchStats, SegmentedTopStats, StatsDimension, StatsGranularity };
