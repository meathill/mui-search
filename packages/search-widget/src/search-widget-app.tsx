/** @jsxImportSource preact */
import type { JSX } from "preact";
import { useEffect, useRef } from "preact/hooks";

import type { HotContentItem, HybridSearchResult, SuggestionItem } from "@mui-search/shared";
import { HotContentsPanel } from "./components/hot-contents-panel";
import { SearchControls } from "./components/search-controls";
import { SearchResultsPanel } from "./components/search-results-panel";
import { SuggestionPanel } from "./components/suggestion-panel";
import type { LocaleOption } from "./constants";
import { getTranslations } from "./locales";
import { resolveContentPanelMode } from "./search-widget-view-model";
import type { SearchApi, SearchWidgetController, SearchWidgetState, SearchWidgetStatus } from "./types";
import { useSearchWidgetState } from "./use-search-widget-state";

interface SearchWidgetAppProps {
  api: SearchApi;
  siteUrl: string;
  localeOptions: LocaleOption[];
  initialLocale: string;
  suggestLimit: number;
  searchLimit: number;
  hotLimit: number;
  hotHours: number;
  debounceMs: number;
  placeholder: string;
  syncQueryToUrl: boolean;
  autoSearchOnInit: boolean;
  initialSuggestQuery: string;
  initialSearchQuery: string;
  bindController(controller: SearchWidgetController): void;
  onStatusChange?(status: SearchWidgetStatus): void;
  onSuggestionsChange?(suggestions: SuggestionItem[]): void;
  onResultsChange?(results: HybridSearchResult[]): void;
  onHotContentsChange?(hotContents: HotContentItem[]): void;
  onError?(error: Error): void;
}

export function SearchWidgetApp(props: SearchWidgetAppProps): JSX.Element {
  const queryInputRef = useRef<HTMLInputElement>(null);
  const widgetState = useSearchWidgetState({
    api: props.api,
    suggestLimit: props.suggestLimit,
    searchLimit: props.searchLimit,
    hotLimit: props.hotLimit,
    hotHours: props.hotHours,
    debounceMs: props.debounceMs,
    syncQueryToUrl: props.syncQueryToUrl,
    autoSearchOnInit: props.autoSearchOnInit,
    initialLocale: props.initialLocale,
    initialSuggestQuery: props.initialSuggestQuery,
    initialSearchQuery: props.initialSearchQuery,
    ...(props.onStatusChange ? { onStatusChange: props.onStatusChange } : {}),
    ...(props.onSuggestionsChange ? { onSuggestionsChange: props.onSuggestionsChange } : {}),
    ...(props.onResultsChange ? { onResultsChange: props.onResultsChange } : {}),
    ...(props.onHotContentsChange ? { onHotContentsChange: props.onHotContentsChange } : {}),
    ...(props.onError ? { onError: props.onError } : {}),
  });

  const {
    hotContents,
    isLoadingHot,
    isSearching,
    isSuggestPending,
    isSuggesting,
    lastSearchQuery,
    locale,
    query,
    results,
    runSearch,
    setLocale,
    setQuery,
    status,
    suggestions,
  } = widgetState;

  const t = getTranslations(locale);

  useEffect(
    function bindExternalController() {
      const controller: SearchWidgetController = {
        search: runSearch,
        setQuery,
        setLocale,
        getState(): SearchWidgetState {
          return {
            query,
            locale,
            suggestions,
            results,
            hotContents,
            isSearching,
            isLoadingHot,
            isSuggesting,
            status,
          };
        },
      };

      props.bindController(controller);
    },
    [
      hotContents,
      isLoadingHot,
      isSearching,
      isSuggesting,
      locale,
      props.bindController,
      query,
      results,
      runSearch,
      setLocale,
      setQuery,
      status,
      suggestions,
    ],
  );

  const isSuggestLoading = isSuggestPending || isSuggesting;
  const contentPanelMode = resolveContentPanelMode(query, lastSearchQuery);

  return (
    <section className="asw-root">
      <SearchControls
        query={query}
        placeholder={props.placeholder}
        isSearching={isSearching}
        clearQueryAriaLabel={t.clearQuery}
        searchButtonAriaLabel={t.refreshNormal}
        queryInputRef={queryInputRef}
        onSearchSubmit={function onSearchSubmit() {
          void runSearch();
        }}
        onQueryInput={function onQueryInput(nextValue) {
          setQuery(nextValue);
        }}
        onClearQuery={function onClearQuery() {
          setQuery("");
          queryInputRef.current?.focus();
        }}
      />

      {status.isError && <p className="asw-status is-error">{status.message}</p>}

      <div className="asw-content-area">
        {contentPanelMode === "hot" && (
          <HotContentsPanel
            hotContents={hotContents}
            hotLimit={props.hotLimit}
            hotHours={props.hotHours}
            isLoadingHot={isLoadingHot}
            siteUrl={props.siteUrl}
            t={t}
          />
        )}

        {contentPanelMode === "suggestion" && (
          <SuggestionPanel
            suggestions={suggestions}
            isSuggestLoading={isSuggestLoading}
            suggestLimit={props.suggestLimit}
            locale={locale}
            siteUrl={props.siteUrl}
            t={t}
          />
        )}

        {contentPanelMode === "search" && (
          <SearchResultsPanel
            query={query}
            results={results}
            isSearching={isSearching}
            locale={locale}
            siteUrl={props.siteUrl}
            apiBaseUrl={props.api.apiBaseUrl}
            t={t}
          />
        )}
      </div>
    </section>
  );
}
