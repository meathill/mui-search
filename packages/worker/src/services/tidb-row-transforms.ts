import type { SuggestionItem } from "@mui-search/shared";
import type { RankedDocument } from "../types";

import { normalizeSearchQuery } from "./tidb-sql-utils";

interface TiDBSuggestionRow {
  id: string | number;
  slug?: string;
  text: string;
  locale?: string;
}

interface TiDBDocumentRow {
  id: string | number;
  slug?: string;
  title: string;
  content: string;
  locale?: string;
  title_fts_score?: number;
  content_fts_score?: number;
  published_at?: string | Date | null;
  category_name?: string | null;
  reading_time_minutes?: number | null;
}

export type { TiDBSuggestionRow, TiDBDocumentRow };

export function mergeAndRankFullTextRows(
  titleRows: TiDBDocumentRow[],
  contentRows: TiDBDocumentRow[],
  normalizedQuery: string,
  limit: number,
): TiDBDocumentRow[] {
  const rowMap = new Map<string, TiDBDocumentRow>();
  for (const row of [...titleRows, ...contentRows]) {
    const rowKey = String(row.id);
    const existing = rowMap.get(rowKey);
    if (!existing) {
      rowMap.set(rowKey, {
        ...row,
        title_fts_score: toNumericScore(row.title_fts_score),
        content_fts_score: toNumericScore(row.content_fts_score),
      });
      continue;
    }

    existing.title_fts_score = Math.max(toNumericScore(existing.title_fts_score), toNumericScore(row.title_fts_score));
    existing.content_fts_score = Math.max(
      toNumericScore(existing.content_fts_score),
      toNumericScore(row.content_fts_score),
    );
  }

  const rows = Array.from(rowMap.values());
  rows.sort(function compareRows(a, b) {
    const titleBucketDiff = getTitleSortBucket(a.title, normalizedQuery) - getTitleSortBucket(b.title, normalizedQuery);
    if (titleBucketDiff !== 0) {
      return titleBucketDiff;
    }

    const scoreDiff =
      toNumericScore(b.title_fts_score) +
      toNumericScore(b.content_fts_score) -
      (toNumericScore(a.title_fts_score) + toNumericScore(a.content_fts_score));
    if (scoreDiff !== 0) {
      return scoreDiff;
    }

    return compareDocumentIdDesc(a.id, b.id);
  });

  return rows.slice(0, limit);
}

export function getTitleSortBucket(title: string, normalizedQuery: string): number {
  const normalizedTitle = normalizeSearchQuery(title);
  if (normalizedTitle === normalizedQuery) {
    return 0;
  }
  if (normalizedTitle.startsWith(normalizedQuery)) {
    return 1;
  }
  if (normalizedTitle.includes(normalizedQuery)) {
    return 2;
  }
  return 3;
}

export function toNumericScore(score: unknown): number {
  if (typeof score === "number" && Number.isFinite(score)) {
    return score;
  }

  const parsed = Number(score);
  if (Number.isFinite(parsed)) {
    return parsed;
  }

  return 0;
}

function compareDocumentIdDesc(a: string | number, b: string | number): number {
  const aNumber = Number(a);
  const bNumber = Number(b);
  if (Number.isFinite(aNumber) && Number.isFinite(bNumber)) {
    return bNumber - aNumber;
  }

  return String(b).localeCompare(String(a));
}

export function toSuggestion(row: TiDBSuggestionRow): SuggestionItem {
  const slug = row.slug?.trim();
  const locale = row.locale?.trim();

  return {
    id: slug || String(row.id),
    text: row.text,
    ...(locale
      ? {
          locale,
        }
      : {}),
  };
}

export function toRankedDocument(row: TiDBDocumentRow): RankedDocument {
  const result: RankedDocument = {
    id: String(row.id),
    title: row.title,
    content: row.content,
  };

  if (typeof row.locale === "string" && row.locale) {
    result.locale = row.locale;
  }
  if (typeof row.slug === "string" && row.slug) {
    result.slug = row.slug;
  }
  if (row.published_at != null) {
    result.publishedAt = row.published_at instanceof Date ? row.published_at.toISOString() : String(row.published_at);
  }
  if (typeof row.category_name === "string" && row.category_name) {
    result.categoryName = row.category_name;
  }
  if (row.reading_time_minutes != null) {
    const parsed = Number(row.reading_time_minutes);
    if (Number.isFinite(parsed)) {
      result.readingTimeMinutes = parsed;
    }
  }

  return result;
}
