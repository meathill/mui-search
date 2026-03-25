import {
  type HotContentItem,
  isLocaleCode,
  isRecord,
  normalizeAbsoluteUrl,
  normalizeLocaleValue,
  normalizePathLike,
} from "@mui-search/shared";

interface Ga4TopItem {
  slug?: string;
  title: string;
  views: number;
  url?: string;
  locale?: string;
}

interface BuildHotContentsOptions {
  targetLocale: string;
  limit: number;
  contentOrigin?: string;
}

export function buildHotContentsFromGa4Payload(payload: unknown, options: BuildHotContentsOptions): HotContentItem[] {
  const normalizedTargetLocale = normalizeLocaleValue(options.targetLocale) ?? "cn";
  const parsed = parseGa4Payload(payload);
  const hourBucket = parsed.updatedAt ?? new Date().toISOString();
  const maxLength = Math.max(1, Math.floor(options.limit));

  return parsed.items
    .filter(function filterByLocale(item) {
      return shouldIncludeByLocale(item, normalizedTargetLocale);
    })
    .slice(0, maxLength)
    .map(function toHotContent(item) {
      const contentId = resolveContentId(item);
      const contentUrl = resolveContentUrl(item, normalizedTargetLocale, options.contentOrigin);

      return {
        hourBucket,
        locale: normalizedTargetLocale,
        contentId,
        contentTitle: item.title,
        hitCount: Math.max(0, item.views),
        ...(contentUrl
          ? {
              contentUrl,
            }
          : {}),
      };
    });
}

function parseGa4Payload(payload: unknown): { updatedAt?: string; items: Ga4TopItem[] } {
  if (!isRecord(payload)) {
    return { items: [] };
  }

  const updatedAt = typeof payload.updated_at === "string" ? payload.updated_at : undefined;
  const rawItems = Array.isArray(payload.items) ? payload.items : [];

  const items = rawItems.filter(isGa4TopItem);
  if (updatedAt) {
    return { updatedAt, items };
  }

  return { items };
}

function isGa4TopItem(value: unknown): value is Ga4TopItem {
  if (!isRecord(value)) {
    return false;
  }

  if (typeof value.title !== "string" || value.title.trim().length === 0) {
    return false;
  }

  if (typeof value.views !== "number" || !Number.isFinite(value.views)) {
    return false;
  }

  if (typeof value.slug === "string" && value.slug.trim().length > 0) {
    return true;
  }

  return typeof value.url === "string" && value.url.trim().length > 0;
}

function shouldIncludeByLocale(item: Ga4TopItem, targetLocale: string): boolean {
  const itemLocale =
    normalizeLocaleValue(item.locale) ?? extractLocaleFromPathLike(item.slug) ?? extractLocaleFromPathLike(item.url);

  if (!itemLocale) {
    return true;
  }

  return itemLocale === targetLocale;
}

function resolveContentId(item: Ga4TopItem): string {
  const slug = normalizePathLike(item.slug);
  if (slug) {
    return slug;
  }

  const pathFromUrl = normalizePathLike(item.url);
  if (pathFromUrl) {
    return pathFromUrl;
  }

  return item.title.trim();
}

function resolveContentUrl(item: Ga4TopItem, targetLocale: string, contentOrigin?: string): string | undefined {
  const explicitUrl = normalizeAbsoluteUrl(item.url);
  if (explicitUrl) {
    return explicitUrl;
  }

  const slug = normalizePathLike(item.slug);
  if (!slug || !contentOrigin) {
    return undefined;
  }

  const segments = slug.split("/").filter(Boolean);
  const lastSegment = segments.at(-1);
  if (!lastSegment || !isLocaleCode(lastSegment)) {
    segments.push(targetLocale);
  }

  return `${contentOrigin}/${segments.join("/")}/`;
}

function extractLocaleFromPathLike(value: string | undefined): string | undefined {
  const path = normalizePathLike(value);
  if (!path) {
    return undefined;
  }

  const lastSegment = path.split("/").filter(Boolean).at(-1);
  if (!lastSegment || !isLocaleCode(lastSegment)) {
    return undefined;
  }

  return normalizeLocaleValue(lastSegment);
}
