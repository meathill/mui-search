import type { HybridSearchResult } from "@mui-search/shared";
import type { RankedDocument } from "../types";

const DEFAULT_RRF_K = 60;
const DEFAULT_KEYWORD_WEIGHT = 1.2;
const DEFAULT_VECTOR_WEIGHT = 1;
const EXACT_TITLE_MATCH_BOOST = 0.12;
const PREFIX_TITLE_MATCH_BOOST = 0.08;
const CONTAINS_TITLE_MATCH_BOOST = 0.04;

interface ScoreAccumulator {
  id: string;
  slug?: string;
  title: string;
  content: string;
  score: number;
  locale?: string;
  publishedAt?: string | null;
  categoryName?: string | null;
  readingTimeMinutes?: number | null;
}

interface MergeRankedResultsOptions {
  rrfK?: number;
  keywordWeight?: number;
  vectorWeight?: number;
  query?: string;
}

export function mergeRankedResults(
  keywordMatches: RankedDocument[],
  vectorMatches: RankedDocument[],
  topK: number,
  options: MergeRankedResultsOptions = {},
): HybridSearchResult[] {
  if (topK <= 0) {
    return [];
  }

  const rrfK = resolvePositiveNumber(options.rrfK, DEFAULT_RRF_K);
  const keywordWeight = resolvePositiveNumber(options.keywordWeight, DEFAULT_KEYWORD_WEIGHT);
  const vectorWeight = resolvePositiveNumber(options.vectorWeight, DEFAULT_VECTOR_WEIGHT);

  const scoreMap = new Map<string, ScoreAccumulator>();

  accumulateScores(scoreMap, keywordMatches, rrfK, keywordWeight);
  accumulateScores(scoreMap, vectorMatches, rrfK, vectorWeight);
  applyTitleMatchBoost(scoreMap, options.query);

  return Array.from(scoreMap.values()).sort(compareByScoreThenId).slice(0, topK).map(toHybridSearchResult);
}

function accumulateScores(
  scoreMap: Map<string, ScoreAccumulator>,
  items: RankedDocument[],
  rrfK: number,
  channelWeight: number,
): void {
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (!item) {
      continue;
    }

    const score = (1 / (rrfK + index + 1)) * channelWeight;
    const previous = scoreMap.get(item.id);

    if (!previous) {
      const nextValue: ScoreAccumulator = {
        id: item.id,
        title: item.title,
        content: item.content,
        score,
      };

      if (item.slug) {
        nextValue.slug = item.slug;
      }
      if (item.locale) {
        nextValue.locale = item.locale;
      }
      if (item.publishedAt != null) {
        nextValue.publishedAt = item.publishedAt;
      }
      if (item.categoryName != null) {
        nextValue.categoryName = item.categoryName;
      }
      if (item.readingTimeMinutes != null) {
        nextValue.readingTimeMinutes = item.readingTimeMinutes;
      }

      scoreMap.set(item.id, nextValue);
      continue;
    }

    previous.score += score;
    if (!previous.title && item.title) {
      previous.title = item.title;
    }
    if (!previous.content && item.content) {
      previous.content = item.content;
    }
    if (!previous.slug && item.slug) {
      previous.slug = item.slug;
    }
    if (!previous.locale && item.locale) {
      previous.locale = item.locale;
    }
    if (previous.publishedAt == null && item.publishedAt != null) {
      previous.publishedAt = item.publishedAt;
    }
    if (previous.categoryName == null && item.categoryName != null) {
      previous.categoryName = item.categoryName;
    }
    if (previous.readingTimeMinutes == null && item.readingTimeMinutes != null) {
      previous.readingTimeMinutes = item.readingTimeMinutes;
    }
  }
}

function applyTitleMatchBoost(scoreMap: Map<string, ScoreAccumulator>, query: string | undefined): void {
  const normalizedQuery = normalizeComparableText(query);
  if (!normalizedQuery || normalizedQuery.length < 2) {
    return;
  }

  for (const item of scoreMap.values()) {
    const normalizedTitle = normalizeComparableText(item.title);
    if (!normalizedTitle) {
      continue;
    }

    if (normalizedTitle === normalizedQuery) {
      item.score += EXACT_TITLE_MATCH_BOOST;
      continue;
    }

    if (normalizedTitle.startsWith(normalizedQuery)) {
      item.score += PREFIX_TITLE_MATCH_BOOST;
      continue;
    }

    if (normalizedTitle.includes(normalizedQuery)) {
      item.score += CONTAINS_TITLE_MATCH_BOOST;
    }
  }
}

function normalizeComparableText(value: string | undefined): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function resolvePositiveNumber(value: number | undefined, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return value;
}

function compareByScoreThenId(a: ScoreAccumulator, b: ScoreAccumulator): number {
  if (a.score === b.score) {
    return a.id.localeCompare(b.id);
  }

  return b.score - a.score;
}

function toHybridSearchResult(item: ScoreAccumulator): HybridSearchResult {
  const result: HybridSearchResult = {
    id: item.id,
    title: item.title,
    content: item.content,
    score: Number(item.score.toFixed(6)),
  };

  if (item.locale) {
    result.locale = item.locale;
  }
  if (item.slug) {
    result.slug = item.slug;
  }
  if (item.publishedAt != null) {
    result.publishedAt = item.publishedAt;
  }
  if (item.categoryName != null) {
    result.categoryName = item.categoryName;
  }
  if (item.readingTimeMinutes != null) {
    result.readingTimeMinutes = item.readingTimeMinutes;
  }

  return result;
}
