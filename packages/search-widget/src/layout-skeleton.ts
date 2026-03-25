export function buildPlaceholderIndexes(limit: number): number[] {
  const count = normalizePositiveInteger(limit, 1);
  return Array.from({ length: count }, (_, index) => index);
}

export function buildRemainingPlaceholderIndexes(limit: number, renderedCount: number): number[] {
  const normalizedLimit = normalizePositiveInteger(limit, 1);
  const normalizedRenderedCount = normalizeNonNegativeInteger(renderedCount, 0);
  const remainingCount = Math.max(0, normalizedLimit - normalizedRenderedCount);

  return Array.from({ length: remainingCount }, (_, index) => index);
}

export function calculateListMinHeight(limit: number, itemMinHeight: number, itemGap: number): number {
  const itemCount = normalizePositiveInteger(limit, 1);
  const normalizedItemMinHeight = normalizePositiveInteger(itemMinHeight, 1);
  const normalizedItemGap = normalizeNonNegativeInteger(itemGap, 0);
  const gapCount = Math.max(0, itemCount - 1);

  return itemCount * normalizedItemMinHeight + gapCount * normalizedItemGap;
}

function normalizePositiveInteger(value: number, fallback: number): number {
  const normalized = Math.trunc(value);
  if (!Number.isFinite(normalized) || normalized <= 0) {
    return fallback;
  }

  return normalized;
}

function normalizeNonNegativeInteger(value: number, fallback: number): number {
  const normalized = Math.trunc(value);
  if (!Number.isFinite(normalized) || normalized < 0) {
    return fallback;
  }

  return normalized;
}
