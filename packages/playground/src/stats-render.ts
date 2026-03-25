import type { SegmentedTopLocaleSummaryItem } from "@mui-search/shared";
import { escapeHtml, populateLocaleOptions } from "./stats-dom";
import { fetchContentQueries } from "./stats-api";
import {
  DEFAULT_API_BASE_URL,
  NUMBER_FORMATTER,
  formatDimensionLabel,
  formatSegmentedTopScopeLabel,
  type DailySearchStats,
  type SegmentedTopStats,
  type StatsView,
} from "./stats-state";

export function renderDailyStats(view: StatsView, stats: DailySearchStats, selectedLocale: string): void {
  const totalSearchCount = stats.days.reduce(function sumSearchCount(total, item) {
    return total + item.searchCount;
  }, 0);
  const dailyAverage = stats.days.length > 0 ? Math.round(totalSearchCount / stats.days.length) : 0;
  const latestDay = stats.days.at(-1);

  view.summaryTotalSearch.textContent = NUMBER_FORMATTER.format(totalSearchCount);
  view.summaryDailyAverage.textContent = NUMBER_FORMATTER.format(dailyAverage);
  view.summaryLatestSearch.textContent = NUMBER_FORMATTER.format(latestDay?.searchCount ?? 0);
  view.summaryLatestUsers.textContent = NUMBER_FORMATTER.format(latestDay?.searchUsersEstimate ?? 0);
  view.estimateBasis.textContent =
    stats.searchUsersEstimateBasis === "distinct_query"
      ? "User count is estimated using daily unique queries."
      : "User count is estimated.";

  populateLocaleOptions(view.localeSelect, stats.locales, selectedLocale);
}

export function renderSegmentedTopStats(view: StatsView, stats: SegmentedTopStats): void {
  const scopeLabel = formatSegmentedTopScopeLabel(stats.granularity, stats.periods);
  const localeLabel = stats.localeFilter === "all" ? "all" : stats.localeFilter;

  view.segmentedTitle.textContent = `Top Details (${scopeLabel} · ${formatDimensionLabel(stats.dimension)})`;
  view.segmentedBucketHeader.textContent = "Scope";
  view.segmentedValueHeader.textContent = stats.dimension === "query" ? "Query" : "Content Title";
  view.segmentedIdHeader.textContent = stats.dimension === "query" ? "-" : "Content ID";

  if (stats.summaryRows.length === 0) {
    view.segmentedBody.innerHTML = "";
    view.segmentedEmpty.hidden = false;
    return;
  }

  const localeSummaryMap = buildLocaleSummaryMap(stats.localeSummaryRows);

  view.segmentedEmpty.hidden = true;
  view.segmentedBody.innerHTML = stats.summaryRows
    .map(function toRow(item, index) {
      const isContent = stats.dimension === "content";
      const contentId = isContent ? escapeHtml(item.contentId ?? "-") : "-";

      const localeBadges = renderLocaleBadges(localeSummaryMap, item.dimensionValue);

      const valueCell = isContent
        ? `<button type="button" class="js-content-query-toggle text-left text-teal-700 dark:text-teal-400 hover:underline cursor-pointer bg-transparent border-none p-0 font-inherit" data-content-id="${escapeHtml(item.contentId ?? "")}">${escapeHtml(item.dimensionValue)}</button>`
        : escapeHtml(item.dimensionValue);

      return `<tr>
        <td class="border-b border-slate-200 dark:border-slate-700 py-[0.52rem] px-[0.42rem] align-top">${index + 1}</td>
        <td class="border-b border-slate-200 dark:border-slate-700 py-[0.52rem] px-[0.42rem] align-top">${escapeHtml(scopeLabel)}</td>
        <td class="border-b border-slate-200 dark:border-slate-700 py-[0.52rem] px-[0.42rem] align-top"><span class="inline-flex px-[0.45rem] py-[0.14rem] rounded-full border border-slate-200 dark:border-slate-700 text-[0.78rem]">${escapeHtml(localeLabel)}</span></td>
        <td class="border-b border-slate-200 dark:border-slate-700 py-[0.52rem] px-[0.42rem] align-top">${valueCell}${localeBadges}</td>
        <td class="border-b border-slate-200 dark:border-slate-700 py-[0.52rem] px-[0.42rem] align-top">${NUMBER_FORMATTER.format(item.hitCount)}</td>
        <td class="border-b border-slate-200 dark:border-slate-700 py-[0.52rem] px-[0.42rem] align-top">${contentId}</td>
      </tr>`;
    })
    .join("");

  if (stats.dimension === "content") {
    bindContentQueryToggleHandlers(view.segmentedBody);
  }
}

function buildLocaleSummaryMap(
  localeSummaryRows?: SegmentedTopLocaleSummaryItem[],
): Map<string, Array<{ locale: string; hitCount: number }>> {
  const map = new Map<string, Array<{ locale: string; hitCount: number }>>();
  if (!localeSummaryRows) {
    return map;
  }

  for (const row of localeSummaryRows) {
    let entries = map.get(row.dimensionValue);
    if (!entries) {
      entries = [];
      map.set(row.dimensionValue, entries);
    }
    entries.push({ locale: row.locale, hitCount: row.hitCount });
  }

  return map;
}

function renderLocaleBadges(
  localeSummaryMap: Map<string, Array<{ locale: string; hitCount: number }>>,
  dimensionValue: string,
): string {
  const entries = localeSummaryMap.get(dimensionValue);
  if (!entries || entries.length === 0) {
    return "";
  }

  const badges = entries
    .map(function toBadge(entry) {
      return `<span class="inline-flex px-[0.35rem] py-[0.08rem] rounded-full bg-slate-100 dark:bg-slate-700 text-[0.7rem] text-slate-600 dark:text-slate-300">${escapeHtml(entry.locale)}: ${NUMBER_FORMATTER.format(entry.hitCount)}</span>`;
    })
    .join(" ");

  return `<div class="mt-[0.3rem] flex flex-wrap gap-[0.25rem]">${badges}</div>`;
}

function bindContentQueryToggleHandlers(tbody: HTMLTableSectionElement): void {
  const buttons = tbody.querySelectorAll<HTMLButtonElement>(".js-content-query-toggle");
  for (const button of buttons) {
    button.addEventListener("click", function onContentQueryToggle() {
      const contentId = button.dataset.contentId;
      if (!contentId) {
        return;
      }

      const parentRow = button.closest("tr");
      if (!parentRow) {
        return;
      }

      const existingDetail = parentRow.nextElementSibling;
      if (existingDetail?.classList.contains("js-content-query-detail")) {
        existingDetail.remove();
        return;
      }

      const detailRow = document.createElement("tr");
      detailRow.classList.add("js-content-query-detail");
      detailRow.innerHTML = `<td colspan="6" class="border-b border-slate-200 dark:border-slate-700 py-[0.52rem] px-[0.42rem] bg-slate-50 dark:bg-slate-800/60">
        <span class="text-slate-400 text-[0.82rem]">Loading related queries...</span>
      </td>`;
      parentRow.after(detailRow);

      void loadContentQueries(detailRow, contentId);
    });
  }
}

async function loadContentQueries(detailRow: HTMLTableRowElement, contentId: string): Promise<void> {
  try {
    const queries = await fetchContentQueries(DEFAULT_API_BASE_URL, contentId, 30, 20);
    if (queries.length === 0) {
      detailRow.innerHTML = `<td colspan="6" class="border-b border-slate-200 dark:border-slate-700 py-[0.52rem] px-[0.42rem] bg-slate-50 dark:bg-slate-800/60">
        <span class="text-slate-400 text-[0.82rem]">No related queries found.</span>
      </td>`;
      return;
    }

    const queryList = queries
      .map(function toQueryTag(item) {
        return `<span class="inline-flex px-[0.45rem] py-[0.14rem] rounded-full border border-teal-200 dark:border-teal-700 bg-teal-50 dark:bg-teal-900/30 text-[0.78rem] text-teal-800 dark:text-teal-300">${escapeHtml(item.query)} <span class="ml-[0.25rem] text-slate-400">${NUMBER_FORMATTER.format(item.clickCount)}</span></span>`;
      })
      .join(" ");

    detailRow.innerHTML = `<td colspan="6" class="border-b border-slate-200 dark:border-slate-700 py-[0.52rem] px-[0.42rem] bg-slate-50 dark:bg-slate-800/60">
      <div class="text-[0.78rem] text-slate-500 dark:text-slate-400 mb-[0.3rem] font-bold">Related Search Queries (last 30 days)</div>
      <div class="flex flex-wrap gap-[0.3rem]">${queryList}</div>
    </td>`;
  } catch {
    detailRow.innerHTML = `<td colspan="6" class="border-b border-slate-200 dark:border-slate-700 py-[0.52rem] px-[0.42rem] bg-slate-50 dark:bg-slate-800/60">
      <span class="text-red-500 text-[0.82rem]">Failed to load related queries.</span>
    </td>`;
  }
}
