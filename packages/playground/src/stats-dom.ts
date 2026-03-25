import type { StatsView } from "./stats-state";
import { cn } from "./utils";

export function resolveView(): StatsView {
  return {
    dailyDaysInput: queryElement<HTMLInputElement>("#stats-days"),
    localeSelect: queryElement<HTMLSelectElement>("#stats-locale"),
    topGranularitySelect: queryElement<HTMLSelectElement>("#stats-top-granularity"),
    topDimensionSelect: queryElement<HTMLSelectElement>("#stats-top-dimension"),
    statusText: queryElement<HTMLParagraphElement>("#stats-status"),
    refreshButton: queryElement<HTMLButtonElement>("#stats-refresh-button"),
    summaryTotalSearch: queryElement<HTMLParagraphElement>("#metric-total-search"),
    summaryDailyAverage: queryElement<HTMLParagraphElement>("#metric-daily-average"),
    summaryLatestSearch: queryElement<HTMLParagraphElement>("#metric-latest-search"),
    summaryLatestUsers: queryElement<HTMLParagraphElement>("#metric-latest-users"),
    estimateBasis: queryElement<HTMLParagraphElement>("#metric-estimate-basis"),
    chartContainer: queryElement<HTMLDivElement>("#stats-chart"),
    localePieContainer: queryElement<HTMLDivElement>("#stats-locale-pie"),
    segmentedChartContainer: queryElement<HTMLDivElement>("#segmented-top-chart"),
    segmentedTitle: queryElement<HTMLHeadingElement>("#segmented-top-title"),
    segmentedBucketHeader: queryElement<HTMLTableCellElement>("#segmented-bucket-header"),
    segmentedValueHeader: queryElement<HTMLTableCellElement>("#segmented-value-header"),
    segmentedIdHeader: queryElement<HTMLTableCellElement>("#segmented-id-header"),
    segmentedBody: queryElement<HTMLTableSectionElement>("#segmented-top-body"),
    segmentedEmpty: queryElement<HTMLParagraphElement>("#segmented-top-empty"),
  };
}

const discoveredLocales = new Set<string>(["all"]);

export function populateLocaleOptions(select: HTMLSelectElement, locales: string[], selectedLocale: string): void {
  for (const locale of locales) {
    discoveredLocales.add(locale);
  }

  const sortedLocales = Array.from(discoveredLocales).sort(function sortLocales(a, b) {
    if (a === "all") return -1;
    if (b === "all") return 1;
    return a.localeCompare(b);
  });

  const optionsHtml = sortedLocales
    .map(function toOption(locale) {
      const selected = locale === selectedLocale ? " selected" : "";
      return `<option value="${locale}"${selected}>${locale}</option>`;
    })
    .join("");

  // Only update if the content has changed to avoid focus/selection issues
  if (select.innerHTML !== optionsHtml) {
    select.innerHTML = optionsHtml;
  }
}

export function setStatus(view: StatsView, message: string, isError: boolean): void {
  view.statusText.textContent = message;
  view.statusText.className = cn(
    "mt-[0.72rem] px-[0.72rem] py-[0.62rem] rounded-[10px] border border-dashed",
    isError
      ? "text-red-800 bg-red-100/70 border-red-600/35 dark:text-red-200 dark:bg-red-900/35 dark:border-red-400/35"
      : "text-slate-500 bg-white/60 border-slate-300 dark:text-slate-400 dark:bg-slate-800/60 dark:border-slate-600",
  );
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function queryElement<TElement extends HTMLElement>(selector: string): TElement {
  const element = document.querySelector<TElement>(selector);
  if (!element) {
    throw new Error(`Missing required element: ${selector}`);
  }
  return element;
}
