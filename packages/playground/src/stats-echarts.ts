import { init, use, type EChartsCoreOption } from "echarts/core";
import { BarChart, LineChart, PieChart } from "echarts/charts";
import { GridComponent, LegendComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { NUMBER_FORMATTER, type DailySearchStats, type SegmentedTopStats, type StatsView } from "./stats-state";

use([LineChart, PieChart, BarChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer]);

const CHART_COLORS = ["#0f766e", "#0891b2", "#2563eb", "#8b5cf6", "#ea580c", "#10b981", "#f59e0b"];
const SEGMENTED_TOP_CHART_MAX_ITEMS = 24;

export interface StatsCharts {
  renderDaily(stats: DailySearchStats, selectedLocale: string): void;
  renderSegmentedTop(stats: SegmentedTopStats): void;
  dispose(): void;
}

export function createStatsCharts(view: StatsView): StatsCharts {
  const trendChart = init(view.chartContainer, undefined, { renderer: "canvas" });
  const localePieChart = init(view.localePieContainer, undefined, { renderer: "canvas" });
  const segmentedTopChart = init(view.segmentedChartContainer, undefined, { renderer: "canvas" });

  let isDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;
  let cachedDailyStats: DailySearchStats | null = null;
  let cachedSelectedLocale: string | null = null;
  let cachedSegmentedTopStats: SegmentedTopStats | null = null;

  const resizeObserver = new ResizeObserver(function resizeAllCharts() {
    trendChart.resize();
    localePieChart.resize();
    segmentedTopChart.resize();
  });

  resizeObserver.observe(view.chartContainer);
  resizeObserver.observe(view.localePieContainer);
  resizeObserver.observe(view.segmentedChartContainer);

  function handleWindowResize(): void {
    trendChart.resize();
    localePieChart.resize();
    segmentedTopChart.resize();
  }

  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  function handleThemeChange(e: MediaQueryListEvent) {
    isDarkMode = e.matches;
    if (cachedDailyStats && cachedSelectedLocale !== null) {
      trendChart.setOption(buildTrendOption(cachedDailyStats, isDarkMode), { notMerge: true, lazyUpdate: true });
      localePieChart.setOption(buildLocalePieOption(cachedDailyStats, cachedSelectedLocale, isDarkMode), {
        notMerge: true,
        lazyUpdate: true,
      });
    }
    if (cachedSegmentedTopStats) {
      segmentedTopChart.setOption(buildSegmentedTopOption(cachedSegmentedTopStats, isDarkMode), {
        notMerge: true,
        lazyUpdate: true,
      });
    }
  }

  window.addEventListener("resize", handleWindowResize);
  mediaQuery.addEventListener("change", handleThemeChange);

  return {
    renderDaily(stats: DailySearchStats, selectedLocale: string): void {
      cachedDailyStats = stats;
      cachedSelectedLocale = selectedLocale;
      trendChart.setOption(buildTrendOption(stats, isDarkMode), { notMerge: true, lazyUpdate: true });
      localePieChart.setOption(buildLocalePieOption(stats, selectedLocale, isDarkMode), {
        notMerge: true,
        lazyUpdate: true,
      });
    },
    renderSegmentedTop(stats: SegmentedTopStats): void {
      cachedSegmentedTopStats = stats;
      segmentedTopChart.setOption(buildSegmentedTopOption(stats, isDarkMode), { notMerge: true, lazyUpdate: true });
    },
    dispose(): void {
      window.removeEventListener("resize", handleWindowResize);
      mediaQuery.removeEventListener("change", handleThemeChange);
      resizeObserver.disconnect();
      trendChart.dispose();
      localePieChart.dispose();
      segmentedTopChart.dispose();
    },
  };
}

function buildTrendOption(stats: DailySearchStats, isDarkMode: boolean): EChartsCoreOption {
  const dayLabels = stats.days.map(function toLabel(item) {
    return item.day;
  });
  const localeSeries = stats.locales.map(function toLocaleSeries(locale, index) {
    return {
      name: locale,
      type: "line",
      smooth: true,
      stack: "locale",
      symbol: "circle",
      showSymbol: false,
      emphasis: {
        focus: "series",
      },
      lineStyle: {
        width: 2,
      },
      areaStyle: {
        opacity: 0.22,
      },
      itemStyle: {
        color: CHART_COLORS[index % CHART_COLORS.length],
      },
      data: stats.days.map(function toLocaleValue(day) {
        return day.localeBreakdown[locale] ?? 0;
      }),
    };
  });

  const TOTAL_LINE_COLOR = isDarkMode ? "#f8fafc" : "#0f172a";
  const TEXT_COLOR = isDarkMode ? "#cbd5e1" : "#475569";

  const totalSeries = {
    name: "Total Searches",
    type: "line",
    smooth: true,
    symbol: "none",
    lineStyle: {
      width: 2.4,
      color: TOTAL_LINE_COLOR,
    },
    itemStyle: {
      color: TOTAL_LINE_COLOR,
    },
    data: stats.days.map(function toTotal(day) {
      return day.searchCount;
    }),
  };

  const series = [...localeSeries, totalSeries];

  return {
    color: CHART_COLORS,
    textStyle: {
      fontFamily: "inherit",
      color: TEXT_COLOR,
    },
    tooltip: {
      trigger: "axis",
      valueFormatter: function formatValue(value: number): string {
        return NUMBER_FORMATTER.format(value);
      },
    },
    legend: {
      type: "scroll",
      top: 2,
      textStyle: { color: TEXT_COLOR },
      data: series.map(function toSeriesName(item) {
        return item.name;
      }),
    },
    grid: {
      top: 48,
      right: 12,
      bottom: 16,
      left: 14,
      containLabel: true,
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      axisTick: {
        show: false,
      },
      data: dayLabels,
      axisLabel: {
        formatter: function formatDay(value: string): string {
          return value.slice(5);
        },
      },
    },
    yAxis: {
      type: "value",
      minInterval: 1,
      axisLabel: {
        formatter: function formatCount(value: number): string {
          return NUMBER_FORMATTER.format(value);
        },
      },
    },
    series,
  };
}

function buildLocalePieOption(stats: DailySearchStats, selectedLocale: string, isDarkMode: boolean): EChartsCoreOption {
  const totalsByLocale = new Map<string, number>();

  for (const day of stats.days) {
    for (const [locale, count] of Object.entries(day.localeBreakdown)) {
      totalsByLocale.set(locale, (totalsByLocale.get(locale) ?? 0) + count);
    }
  }

  const TEXT_COLOR = isDarkMode ? "#cbd5e1" : "#475569";

  const items = Array.from(totalsByLocale.entries())
    .map(function toItem([locale, total]) {
      return {
        name: locale,
        value: total,
      };
    })
    .filter(function hasPositive(item) {
      return item.value > 0;
    })
    .sort(function sortByValue(a, b) {
      return b.value - a.value;
    });

  if (items.length === 0) {
    return {
      title: {
        text: "No locale share data",
        left: "center",
        top: "middle",
        textStyle: {
          fontSize: 13,
          fontWeight: 500,
          color: "#64748b",
        },
      },
      series: [],
    };
  }

  const subtitle = selectedLocale === "all" ? "Current filter: all locales" : `Current filter: ${selectedLocale}`;
  return {
    color: CHART_COLORS,
    title: {
      text: subtitle,
      left: "center",
      top: 0,
      textStyle: {
        fontSize: 12,
        fontWeight: 500,
        color: TEXT_COLOR,
      },
    },
    tooltip: {
      trigger: "item",
      formatter: function formatItem(params: { name: string; value: number; percent: number }): string {
        return `${params.name}<br/>${NUMBER_FORMATTER.format(params.value)} (${params.percent}%)`;
      },
    },
    legend: {
      type: "scroll",
      orient: "vertical",
      right: 0,
      top: "middle",
      textStyle: { color: TEXT_COLOR },
      itemHeight: 10,
      itemWidth: 10,
    },
    series: [
      {
        name: "Locale Share",
        type: "pie",
        radius: ["42%", "68%"],
        center: ["36%", "54%"],
        avoidLabelOverlap: true,
        minAngle: 6,
        label: {
          formatter: "{b}: {d}%",
        },
        labelLine: {
          length: 10,
          length2: 8,
        },
        data: items,
      },
    ],
  };
}

function buildSegmentedTopOption(stats: SegmentedTopStats, isDarkMode: boolean): EChartsCoreOption {
  const TEXT_COLOR = isDarkMode ? "#cbd5e1" : "#475569";
  const items = stats.summaryRows
    .map(function toItem(item) {
      return {
        label: item.dimensionValue,
        total: item.hitCount,
      };
    })
    .slice(0, SEGMENTED_TOP_CHART_MAX_ITEMS);

  const metricName = stats.dimension === "query" ? "Query Frequency" : "Content Frequency";
  if (items.length === 0) {
    return {
      title: {
        text: `No ${metricName.toLowerCase()} data`,
        left: "center",
        top: "middle",
        textStyle: {
          fontSize: 13,
          fontWeight: 500,
          color: "#64748b",
        },
      },
      series: [],
    };
  }

  const barColor = stats.dimension === "query" ? "#0ea5e9" : "#8b5cf6";
  return {
    color: [barColor],
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "shadow",
      },
      formatter: function formatBarTooltip(params: Array<{ name: string; value: number }>): string {
        const current = params[0];
        if (!current) {
          return "";
        }
        return `${current.name}<br/>${metricName}: ${NUMBER_FORMATTER.format(current.value)}`;
      },
    },
    grid: {
      top: 18,
      right: 16,
      bottom: 10,
      left: 12,
      containLabel: true,
    },
    xAxis: {
      type: "value",
      minInterval: 1,
      axisLabel: {
        color: TEXT_COLOR,
        formatter: function formatValue(value: number): string {
          return NUMBER_FORMATTER.format(value);
        },
      },
    },
    yAxis: {
      type: "category",
      inverse: true,
      axisLabel: {
        color: TEXT_COLOR,
        width: 220,
        overflow: "truncate",
      },
      data: items.map(function toLabel(item) {
        return item.label;
      }),
    },
    series: [
      {
        name: metricName,
        type: "bar",
        barMaxWidth: 24,
        data: items.map(function toValue(item) {
          return item.total;
        }),
        label: {
          show: true,
          position: "right",
          color: TEXT_COLOR,
          formatter: function formatLabel(params: { value: number }): string {
            return NUMBER_FORMATTER.format(params.value);
          },
        },
      },
    ],
  };
}
