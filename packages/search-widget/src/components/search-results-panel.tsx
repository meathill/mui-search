/** @jsxImportSource preact */
import type { JSX } from "preact";

import type { HybridSearchResult } from "@mui-search/shared";
import { submitClickTrackingByBeacon } from "../click-tracker";
import { buildContentTargetUrl } from "../content-target-url";
import type { TranslationText } from "../locales";
import { slimDisplayTitle } from "../title-slimmer";

interface SearchResultsPanelProps {
  query: string;
  results: HybridSearchResult[];
  isSearching: boolean;
  locale: string;
  siteUrl: string;
  apiBaseUrl: string;
  t: TranslationText;
}

export function SearchResultsPanel(props: SearchResultsPanelProps): JSX.Element {
  return (
    <section className="asw-panel asw-search-panel">
      <h3>
        {props.t.searchTitle}
        {props.isSearching && <span className="asw-loading-indicator">...</span>}
      </h3>
      <ul className="asw-list">
        {props.results.length === 0 ? (
          <li className="asw-empty">{props.isSearching ? props.t.refreshLoading : props.t.emptySearchResults}</li>
        ) : (
          props.results.map(function renderResult(item) {
            const displayTitle = slimDisplayTitle(item.title) || item.title;
            const resultTargetUrl = buildContentTargetUrl({
              siteUrl: props.siteUrl,
              slugOrPath: item.slug ?? item.id,
              locale: item.locale ?? props.locale,
              explicitUrl: item.url,
            });
            const resultContentId = item.slug ?? item.id;

            if (!resultTargetUrl) {
              return (
                <li key={item.id} className="asw-result">
                  <p className="asw-title">{displayTitle}</p>
                  <p className="asw-content">{item.content}</p>
                </li>
              );
            }

            return (
              <li key={item.id} className="asw-result">
                <a
                  href={resultTargetUrl}
                  className="asw-result-link"
                  onClick={function onTrackClick() {
                    const payload = {
                      query: props.query,
                      contentId: resultContentId,
                      contentTitle: item.title,
                      locale: props.locale,
                      contentLocale: item.locale ?? props.locale,
                    };
                    submitClickTrackingByBeacon({
                      apiBaseUrl: props.apiBaseUrl,
                      payload,
                    });
                  }}
                >
                  <p className="asw-title">{displayTitle}</p>
                  <p className="asw-content">{item.content}</p>
                </a>
              </li>
            );
          })
        )}
      </ul>
    </section>
  );
}
