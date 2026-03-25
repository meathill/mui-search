import { debounce } from "lodash-es";
import { normalizeApiBaseUrl } from "./requests/client-utils";
import { fetchDailySearchStats, fetchSegmentedTopStats } from "./stats-api";
import { populateLocaleOptions, resolveView, setStatus } from "./stats-dom";
import { renderDailyStats, renderSegmentedTopStats } from "./stats-render";
import {
  activateFilteredStatsScope,
  buildSegmentedTopRequest,
  createDefaultStatsState,
  formatSegmentedTopScopeLabel,
  normalizeDimensionValue,
  normalizeGranularityValue,
  normalizeLocaleValue,
  parseDailyDaysInput,
  type StatsRequestState,
  type StatsView,
} from "./stats-state";
import "./stats.css";

interface StatsCharts {
  renderDaily: (stats: Awaited<ReturnType<typeof fetchDailySearchStats>>, selectedLocale: string) => void;
  renderSegmentedTop: (stats: Awaited<ReturnType<typeof fetchSegmentedTopStats>>) => void;
  dispose: () => void;
}

const DEBOUNCE_DELAY_MS = 400;

let chartsInstance: StatsCharts | null = null;
let chartsLoader: Promise<StatsCharts> | null = null;
let debouncedLoadStats: ReturnType<typeof debounce> | null = null;

function initStatsPage(): void {
  const view = resolveView();
  const state = createDefaultStatsState();

  syncInputsFromState(view, state);
  populateLocaleOptions(view.localeSelect, [], state.locale);

  window.addEventListener(
    "beforeunload",
    function onBeforeUnload() {
      chartsInstance?.dispose();
    },
    { once: true },
  );

  view.refreshButton.addEventListener("click", function onRefreshClick() {
    void loadStats(view, state, "manual");
  });

  debouncedLoadStats = debounce(() => {
    void loadStats(view, state, "manual");
  }, DEBOUNCE_DELAY_MS);

  view.dailyDaysInput.addEventListener("change", function onDailyDaysChanged() {
    state.dailyDays = parseDailyDaysInput(view.dailyDaysInput.value);
    state.filteredDailyDays = state.dailyDays;
    state.statsScope = "filtered";
    view.dailyDaysInput.value = String(state.dailyDays);
    debouncedLoadStats?.();
  });

  view.topGranularitySelect.addEventListener("change", function onTopGranularityChanged() {
    activateFilteredStatsScope(state);
    state.topGranularity = normalizeGranularityValue(view.topGranularitySelect.value);
    view.topGranularitySelect.value = state.topGranularity;
    debouncedLoadStats?.();
  });

  view.topDimensionSelect.addEventListener("change", function onTopDimensionChanged() {
    activateFilteredStatsScope(state);
    state.topDimension = normalizeDimensionValue(view.topDimensionSelect.value);
    view.topDimensionSelect.value = state.topDimension;
    debouncedLoadStats?.();
  });

  view.localeSelect.addEventListener("change", function onLocaleChanged() {
    activateFilteredStatsScope(state);
    state.locale = normalizeLocaleValue(view.localeSelect.value);
    debouncedLoadStats?.();
  });

  void loadStats(view, state, "auto");
}

async function loadStats(view: StatsView, state: StatsRequestState, trigger: "auto" | "manual"): Promise<void> {
  view.refreshButton.disabled = true;
  setStatus(view, "Loading analytics...", false);

  syncStateFromInputs(view, state);
  syncInputsFromState(view, state);

  try {
    const chartsPromise = ensureStatsCharts(view).catch(function onChartsLoadError(error) {
      console.error("[stats] Failed to load chart module, rendering table data only", error);
      return null;
    });
    const segmentedTopRequest = buildSegmentedTopRequest(state);
    const [dailyStats, segmentedTopStats, charts] = await Promise.all([
      fetchDailySearchStats(state.apiBaseUrl, state.dailyDays, state.locale),
      fetchSegmentedTopStats(state.apiBaseUrl, segmentedTopRequest),
      chartsPromise,
    ]);

    renderDailyStats(view, dailyStats, state.locale);
    renderSegmentedTopStats(view, segmentedTopStats);
    charts?.renderDaily(dailyStats, state.locale);
    charts?.renderSegmentedTop(segmentedTopStats);

    const mode = trigger === "manual" ? "Manual refresh" : "Auto load";
    const segmentedTopSummary =
      state.statsScope === "today"
        ? "today's analytics"
        : `${formatSegmentedTopScopeLabel(segmentedTopStats.granularity, segmentedTopStats.periods)} top details across current filters`;
    setStatus(view, `${mode} completed: last ${state.dailyDays} days trend + ${segmentedTopSummary} updated.`, false);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setStatus(view, `Load failed: ${message}`, true);
  } finally {
    view.refreshButton.disabled = false;
  }
}

function ensureStatsCharts(view: StatsView): Promise<StatsCharts> {
  if (chartsInstance) {
    return Promise.resolve(chartsInstance);
  }

  if (!chartsLoader) {
    chartsLoader = import("./stats-echarts")
      .then(function create(module) {
        chartsInstance = module.createStatsCharts(view);
        return chartsInstance;
      })
      .catch(function onImportError(error) {
        chartsLoader = null;
        throw error;
      });
  }

  return chartsLoader;
}

function syncStateFromInputs(view: StatsView, state: StatsRequestState): void {
  const nextDailyDays = parseDailyDaysInput(view.dailyDaysInput.value);
  const nextTopGranularity = normalizeGranularityValue(view.topGranularitySelect.value);
  const nextTopDimension = normalizeDimensionValue(view.topDimensionSelect.value);
  const nextLocale = normalizeLocaleValue(view.localeSelect.value);

  const shouldActivateFilteredScope =
    state.statsScope === "today" &&
    (nextDailyDays !== state.dailyDays ||
      nextTopGranularity !== state.topGranularity ||
      nextTopDimension !== state.topDimension ||
      nextLocale !== state.locale);

  if (shouldActivateFilteredScope) {
    state.statsScope = "filtered";
  }

  state.dailyDays = nextDailyDays;
  if (state.statsScope === "filtered") {
    state.filteredDailyDays = nextDailyDays;
  }
  state.topGranularity = nextTopGranularity;
  state.topDimension = nextTopDimension;
  state.locale = nextLocale;
}

function syncInputsFromState(view: StatsView, state: StatsRequestState): void {
  view.dailyDaysInput.value = String(state.dailyDays);
  view.topGranularitySelect.value = state.topGranularity;
  view.topDimensionSelect.value = state.topDimension;
}

initStatsPage();
