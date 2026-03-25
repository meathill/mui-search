import type { HotContentItem } from "@mui-search/shared";

export interface AggregatedHotContentItem {
  contentId: string;
  contentTitle: string;
  locale: string;
  hitCount: number;
  contentUrl?: string;
}

export function aggregateHotContents(items: HotContentItem[], limit: number): AggregatedHotContentItem[] {
  const byContent = new Map<string, AggregatedHotContentItem>();

  for (const item of items) {
    const contentTitle = item.contentTitle.trim();
    if (!contentTitle) {
      continue;
    }

    const key = `${item.contentId}\u0000${item.locale}`;
    const existing = byContent.get(key);
    if (!existing) {
      byContent.set(key, {
        contentId: item.contentId,
        contentTitle,
        locale: item.locale,
        hitCount: Math.max(0, item.hitCount),
        ...(item.contentUrl
          ? {
              contentUrl: item.contentUrl,
            }
          : {}),
      });
      continue;
    }

    existing.hitCount += Math.max(0, item.hitCount);
    if (!existing.contentUrl && item.contentUrl) {
      existing.contentUrl = item.contentUrl;
    }
  }

  return Array.from(byContent.values())
    .sort(function sortHotItems(a, b) {
      if (b.hitCount !== a.hitCount) {
        return b.hitCount - a.hitCount;
      }
      if (a.contentTitle !== b.contentTitle) {
        return a.contentTitle.localeCompare(b.contentTitle, "en");
      }

      if (a.locale !== b.locale) {
        return a.locale.localeCompare(b.locale, "en");
      }

      return a.contentId.localeCompare(b.contentId, "en");
    })
    .slice(0, limit);
}
