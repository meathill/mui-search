import type { SegmentedTopStatItem, SegmentedTopSummaryItem, StatsDimension } from "./contracts";

export function compareSegmentedTopRows(a: SegmentedTopStatItem, b: SegmentedTopStatItem): number {
  if (a.periodBucket !== b.periodBucket) {
    return b.periodBucket.localeCompare(a.periodBucket);
  }

  if (a.hitCount !== b.hitCount) {
    return b.hitCount - a.hitCount;
  }

  if (a.locale !== b.locale) {
    return a.locale.localeCompare(b.locale);
  }

  if (a.dimensionValue !== b.dimensionValue) {
    return a.dimensionValue.localeCompare(b.dimensionValue);
  }

  return (a.contentId ?? "").localeCompare(b.contentId ?? "");
}

export function sortSegmentedTopRows(rows: SegmentedTopStatItem[]): SegmentedTopStatItem[] {
  return [...rows].sort(compareSegmentedTopRows);
}

export function compareSegmentedTopSummaryRows(a: SegmentedTopSummaryItem, b: SegmentedTopSummaryItem): number {
  if (a.hitCount !== b.hitCount) {
    return b.hitCount - a.hitCount;
  }

  if (a.dimensionValue !== b.dimensionValue) {
    return a.dimensionValue.localeCompare(b.dimensionValue);
  }

  return (a.contentId ?? "").localeCompare(b.contentId ?? "");
}

export function sortSegmentedTopSummaryRows(rows: SegmentedTopSummaryItem[]): SegmentedTopSummaryItem[] {
  return [...rows].sort(compareSegmentedTopSummaryRows);
}

export function aggregateSegmentedTopRows(
  rows: SegmentedTopStatItem[],
  dimension: StatsDimension,
  limit?: number,
): SegmentedTopSummaryItem[] {
  const aggregatedRows = new Map<string, SegmentedTopSummaryItem>();

  for (const row of rows) {
    const key = dimension === "content" ? `${row.contentId ?? ""}\u0000${row.dimensionValue}` : `${row.dimensionValue}`;
    const existing = aggregatedRows.get(key);

    if (existing) {
      existing.hitCount += row.hitCount;
      continue;
    }

    const aggregatedRow: SegmentedTopSummaryItem = {
      dimensionValue: row.dimensionValue,
      hitCount: row.hitCount,
    };

    if (row.contentId) {
      aggregatedRow.contentId = row.contentId;
    }

    aggregatedRows.set(key, aggregatedRow);
  }

  const normalizedLimit =
    typeof limit === "number" && Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : undefined;
  const sortedRows = sortSegmentedTopSummaryRows(Array.from(aggregatedRows.values()));
  return normalizedLimit ? sortedRows.slice(0, normalizedLimit) : sortedRows;
}
