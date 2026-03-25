/** @jsxImportSource preact */
import type { JSX } from "preact";

import type { HotContentItem } from "@mui-search/shared";
import { buildContentTargetUrl } from "../content-target-url";
import { aggregateHotContents } from "../hot-contents";
import { buildPlaceholderIndexes, calculateListMinHeight } from "../layout-skeleton";
import type { TranslationText } from "../locales";
import { slimDisplayTitle } from "../title-slimmer";

const HOT_ITEM_MIN_HEIGHT_PX = 40;
const HOT_ITEM_GAP_PX = 6;

interface HotContentsPanelProps {
  hotContents: HotContentItem[];
  hotLimit: number;
  hotHours: number;
  isLoadingHot: boolean;
  siteUrl: string;
  t: TranslationText;
}

export function HotContentsPanel(props: HotContentsPanelProps): JSX.Element {
  const hotCandidates = aggregateHotContents(props.hotContents, props.hotLimit);
  const hotPlaceholderIndexes = buildPlaceholderIndexes(props.hotLimit);
  const hotListStyle: JSX.CSSProperties = {
    minHeight: `${calculateListMinHeight(props.hotLimit, HOT_ITEM_MIN_HEIGHT_PX, HOT_ITEM_GAP_PX)}px`,
  };

  return (
    <section className="asw-panel asw-hot-panel">
      <h3>{props.t.hotContentsTitle(props.hotHours)}</h3>
      <ul className="asw-list asw-hot-list" style={hotListStyle}>
        {props.isLoadingHot ? (
          hotPlaceholderIndexes.map(function renderHotPlaceholder(index) {
            return (
              <li key={`hot-placeholder-${index}`}>
                <span className="asw-suggestion asw-static-item asw-hot-skeleton" aria-hidden="true">
                  <span className="asw-hot-title asw-skeleton-line" />
                  <span className="asw-hot-meta asw-skeleton-meta" />
                </span>
              </li>
            );
          })
        ) : hotCandidates.length === 0 ? (
          <li className="asw-empty">{props.t.emptyHotContents}</li>
        ) : (
          hotCandidates.map(function renderHotItem(item) {
            const displayTitle = slimDisplayTitle(item.contentTitle) || item.contentTitle;
            const hotTargetUrl = buildContentTargetUrl({
              siteUrl: props.siteUrl,
              slugOrPath: item.contentId,
              locale: item.locale,
              explicitUrl: item.contentUrl,
            });

            if (hotTargetUrl) {
              return (
                <li key={`${item.contentId}-${item.locale}`}>
                  <a className="asw-suggestion asw-hot-link" href={hotTargetUrl}>
                    <span className="asw-hot-title">{displayTitle}</span>
                    <span className="asw-hot-meta">{props.t.hotContentHitCount(item.hitCount)}</span>
                  </a>
                </li>
              );
            }

            return (
              <li key={`${item.contentId}-${item.locale}`}>
                <span className="asw-suggestion asw-static-item">
                  <span className="asw-hot-title">{displayTitle}</span>
                  <span className="asw-hot-meta">{props.t.hotContentHitCount(item.hitCount)}</span>
                </span>
              </li>
            );
          })
        )}
      </ul>
    </section>
  );
}
