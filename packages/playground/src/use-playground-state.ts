import { debounce } from "lodash-es";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";

import type { HotContentItem, HybridSearchResult, SuggestionItem } from "@mui-search/shared";
import { buildSuggestionCacheKey, parseLimitInput, setStatusMessage } from "./app-utils";
import {
  DEBOUNCE_DELAY_MS,
  DEFAULT_LOCALE,
  HOT_HOURS,
  HOT_LIMIT,
  SEARCH_LIMIT,
  SUGGESTION_CACHE_SIZE,
  SUGGESTION_LIMIT,
} from "./constants";
import { useRequestHotContents, useRequestSuggestions, useRunSearch, useTrackResultClick } from "./hooks";
import { LruCache } from "./lru-cache";
import type { PlaygroundState } from "./playground-types";
import { buildRelativeUrlWithQueryState, readQueryStateFromUrl } from "./url-query-state";

const DEFAULT_API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? window.location.origin;
const INITIAL_URL_QUERY_STATE = readQueryStateFromUrl(window.location.href);

export function usePlaygroundState(): PlaygroundState {
  const [apiBaseUrl, setApiBaseUrl] = useState(DEFAULT_API_BASE_URL);
  const [query, setQuery] = useState(INITIAL_URL_QUERY_STATE.suggestQuery || INITIAL_URL_QUERY_STATE.searchQuery);
  const [localeFilter, setLocaleFilter] = useState(DEFAULT_LOCALE);
  const [suggestLimitInput, setSuggestLimitInput] = useState(String(SUGGESTION_LIMIT));
  const [searchLimitInput, setSearchLimitInput] = useState(String(SEARCH_LIMIT));
  const [hotLimitInput, setHotLimitInput] = useState(String(HOT_LIMIT));
  const [hotHoursInput, setHotHoursInput] = useState(String(HOT_HOURS));
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [results, setResults] = useState<HybridSearchResult[]>([]);
  const [hotContents, setHotContents] = useState<HotContentItem[]>([]);
  const [statusText, setStatusText] = useState("Waiting for requests...");
  const [isStatusError, setIsStatusError] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingHot, setIsLoadingHot] = useState(false);
  const [isTrackingResultId, setIsTrackingResultId] = useState("");
  const [lastSearchQuery, setLastSearchQuery] = useState(INITIAL_URL_QUERY_STATE.searchQuery);
  const [lastSearchLocale, setLastSearchLocale] = useState(DEFAULT_LOCALE);

  const suggestionCacheRef = useRef(new LruCache<string, SuggestionItem[]>(SUGGESTION_CACHE_SIZE));
  const latestSuggestRequestIdRef = useRef(0);
  const hasAutoSearchedRef = useRef(false);
  const runSearchRef = useRef<(queryOverride?: string) => Promise<void>>(async function initSearch() {
    return;
  });

  const requestSuggestions = useRequestSuggestions({
    apiBaseUrl,
    localeFilter,
    query,
    suggestLimitInput,
    suggestionCacheRef,
    latestSuggestRequestIdRef,
    setSuggestions,
    setStatusText,
    setIsStatusError,
  });

  const debouncedRequestSuggestions = useMemo(
    () => debounce((q: string) => void requestSuggestions("auto", q), DEBOUNCE_DELAY_MS),
    [requestSuggestions],
  );

  useEffect(() => {
    return () => debouncedRequestSuggestions.cancel();
  }, [debouncedRequestSuggestions]);

  const requestHotContents = useRequestHotContents({
    apiBaseUrl,
    localeFilter,
    hotLimitInput,
    hotHoursInput,
    setHotContents,
    setStatusText,
    setIsStatusError,
    setIsLoadingHot,
  });

  const runSearch = useRunSearch({
    apiBaseUrl,
    localeFilter,
    query,
    searchLimitInput,
    setQuery,
    setResults,
    setStatusText,
    setIsStatusError,
    setIsSearching,
    setLastSearchQuery,
    setLastSearchLocale,
    requestHotContents,
  });

  const onTrackResultClick = useTrackResultClick({
    apiBaseUrl,
    localeFilter,
    query,
    lastSearchQuery,
    lastSearchLocale,
    setIsTrackingResultId,
    setStatusText,
    setIsStatusError,
    requestHotContents,
  });

  useEffect(
    function watchQueryChanges() {
      const normalizedQuery = query.trim();
      if (!normalizedQuery) {
        setSuggestions([]);
        setStatusMessage("Enter a query to continue.", false, setStatusText, setIsStatusError);
        debouncedRequestSuggestions.cancel();
        return undefined;
      }

      const limit = parseLimitInput(suggestLimitInput, SUGGESTION_LIMIT);
      const cacheKey = buildSuggestionCacheKey(normalizedQuery, limit, localeFilter);
      const cachedSuggestions = suggestionCacheRef.current.get(cacheKey);
      if (cachedSuggestions) {
        setSuggestions(cachedSuggestions);
        setStatusMessage("Auto suggestions hit local cache.", false, setStatusText, setIsStatusError);
        debouncedRequestSuggestions.cancel();
        return undefined;
      }

      debouncedRequestSuggestions(normalizedQuery);
    },
    [localeFilter, query, debouncedRequestSuggestions, suggestLimitInput],
  );

  useEffect(
    function loadInitialHotContents() {
      void requestHotContents("auto");
    },
    [requestHotContents],
  );

  useEffect(function runInitialSearchFromUrl() {
    if (hasAutoSearchedRef.current) {
      return;
    }

    const initialSearchQuery = INITIAL_URL_QUERY_STATE.searchQuery.trim();
    if (!initialSearchQuery) {
      return;
    }

    hasAutoSearchedRef.current = true;
    void runSearchRef.current(initialSearchQuery);
  }, []);

  useEffect(
    function syncQueriesToUrl() {
      const nextRelativeUrl = buildRelativeUrlWithQueryState(window.location.href, {
        suggestQuery: query,
        searchQuery: lastSearchQuery,
      });
      const currentRelativeUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (nextRelativeUrl !== currentRelativeUrl) {
        window.history.replaceState(null, "", nextRelativeUrl);
      }
    },
    [lastSearchQuery, query],
  );

  runSearchRef.current = runSearch;

  function onSubmitSearch(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    void runSearch();
  }

  function onClickSuggest(): void {
    void requestSuggestions("manual");
  }

  function onClickRefreshHot(): void {
    void requestHotContents("manual");
  }

  function onApplySuggestion(text: string): void {
    setQuery(text);
  }

  return {
    apiBaseUrl,
    localeFilter,
    query,
    suggestLimitInput,
    searchLimitInput,
    hotLimitInput,
    hotHoursInput,
    suggestions,
    results,
    hotContents,
    statusText,
    isStatusError,
    isSearching,
    isLoadingHot,
    isTrackingResultId,
    onSubmitSearch,
    onClickSuggest,
    onClickRefreshHot,
    onApplySuggestion,
    onTrackResultClick,
    onApiBaseUrlChange: setApiBaseUrl,
    onLocaleChange: setLocaleFilter,
    onQueryChange: setQuery,
    onSuggestLimitChange: setSuggestLimitInput,
    onSearchLimitChange: setSearchLimitInput,
    onHotLimitChange: setHotLimitInput,
    onHotHoursChange: setHotHoursInput,
  };
}
