/** @jsxImportSource preact */
import type { JSX } from "preact";

import type { SuggestionItem } from "@mui-search/shared";
import { buildContentTargetUrl } from "../content-target-url";
import { buildPlaceholderIndexes, buildRemainingPlaceholderIndexes, calculateListMinHeight } from "../layout-skeleton";
import type { TranslationText } from "../locales";
import { calculateSuggestionRenderedCount } from "../search-widget-view-model";
import { slimDisplayTitle } from "../title-slimmer";

const SUGGEST_ITEM_MIN_HEIGHT_PX = 40;
const SUGGEST_ITEM_GAP_PX = 6;

interface SuggestionPanelProps {
  suggestions: SuggestionItem[];
  isSuggestLoading: boolean;
  suggestLimit: number;
  locale: string;
  siteUrl: string;
  t: TranslationText;
}

export function SuggestionPanel(props: SuggestionPanelProps): JSX.Element {
  const suggestionPlaceholderIndexes = buildPlaceholderIndexes(props.suggestLimit);
  const suggestionRenderedCount = calculateSuggestionRenderedCount({
    suggestionCount: props.suggestions.length,
    isSuggestLoading: props.isSuggestLoading,
  });
  const suggestionPaddingIndexes = buildRemainingPlaceholderIndexes(props.suggestLimit, suggestionRenderedCount);
  const suggestionListStyle: JSX.CSSProperties = {
    minHeight: `${calculateListMinHeight(props.suggestLimit, SUGGEST_ITEM_MIN_HEIGHT_PX, SUGGEST_ITEM_GAP_PX)}px`,
  };

  return (
    <section className="asw-panel">
      <h3>
        {props.t.suggestTitle}
        {props.isSuggestLoading && <span className="asw-loading-indicator">...</span>}
      </h3>
      <ul className="asw-list asw-suggestion-list" style={suggestionListStyle}>
        {props.suggestions.length === 0 ? (
          props.isSuggestLoading ? (
            suggestionPlaceholderIndexes.map(function renderSuggestionPlaceholder(index) {
              return (
                <li key={`suggest-placeholder-${index}`}>
                  <span className="asw-suggestion asw-static-item asw-suggestion-skeleton" aria-hidden="true">
                    <span className="asw-skeleton-line" />
                  </span>
                </li>
              );
            })
          ) : (
            <>
              <li className="asw-empty">{props.t.emptySuggestions}</li>
              {suggestionPaddingIndexes.map(function renderSuggestionPadding(index) {
                return (
                  <li key={`suggest-padding-empty-${index}`} aria-hidden="true">
                    <span className="asw-suggestion asw-static-item asw-suggestion-padding" />
                  </li>
                );
              })}
            </>
          )
        ) : (
          <>
            {props.suggestions.map(function renderSuggestion(item) {
              const suggestionKey = `${item.id}\u0000${item.locale ?? "all"}`;
              const displayTitle = slimDisplayTitle(item.text) || item.text;
              const suggestionTargetUrl = buildContentTargetUrl({
                siteUrl: props.siteUrl,
                slugOrPath: item.id,
                locale: item.locale ?? props.locale,
              });

              if (!suggestionTargetUrl) {
                return (
                  <li key={suggestionKey}>
                    <span className="asw-suggestion asw-static-item asw-suggestion-static">
                      <span className="asw-suggestion-text">{displayTitle}</span>
                    </span>
                  </li>
                );
              }

              return (
                <li key={suggestionKey}>
                  <a className="asw-suggestion asw-suggestion-link" href={suggestionTargetUrl}>
                    <span className="asw-suggestion-text">{displayTitle}</span>
                  </a>
                </li>
              );
            })}
            {suggestionPaddingIndexes.map(function renderSuggestionPadding(index) {
              return (
                <li key={`suggest-padding-${index}`} aria-hidden="true">
                  <span className="asw-suggestion asw-static-item asw-suggestion-padding" />
                </li>
              );
            })}
          </>
        )}
      </ul>
    </section>
  );
}
