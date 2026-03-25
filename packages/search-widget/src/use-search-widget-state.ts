import { debounce } from "lodash-es";
import { useCallback, useEffect, useMemo, useRef, useState } from "preact/hooks";

import { type HotContentItem, type HybridSearchResult, type SuggestionItem } from "@mui-search/shared";
import { getTranslations } from "./locales";
import { buildRelativeUrlWithQueryState } from "./query-state";
import {
  requestHotContentsAction,
  requestSuggestionsAction,
  runSearchAction,
  toReadableStatusMessage,
  trackResultClickAction,
} from "./search-widget-requests";
import type { SearchApi, SearchWidgetStatus } from "./types";

export interface UseSearchWidgetStateOptions {
  api: SearchApi;
  initialLocale: string;
  suggestLimit: number;
  searchLimit: number;
  hotLimit: number;
  hotHours: number;
  debounceMs: number;
  syncQueryToUrl: boolean;
  autoSearchOnInit: boolean;
  initialSuggestQuery: string;
  initialSearchQuery: string;
  onStatusChange?(status: SearchWidgetStatus): void;
  onSuggestionsChange?(suggestions: SuggestionItem[]): void;
  onResultsChange?(results: HybridSearchResult[]): void;
  onHotContentsChange?(hotContents: HotContentItem[]): void;
  onError?(error: Error): void;
}

interface UseSearchWidgetStateResult {
  query: string;
  lastSearchQuery: string;
  locale: string;
  suggestions: SuggestionItem[];
  results: HybridSearchResult[];
  hotContents: HotContentItem[];
  isSearching: boolean;
  isLoadingHot: boolean;
  isSuggesting: boolean;
  isSuggestPending: boolean;
  trackingId: string;
  status: SearchWidgetStatus;
  setQuery(value: string): void;
  setLocale(value: string): void;
  runSearch(queryOverride?: string): Promise<void>;
  requestSuggestions(queryOverride?: string, source?: "auto" | "manual"): Promise<void>;
  requestHotContents(source?: "auto" | "manual"): Promise<void>;
  trackResultClick(item: HybridSearchResult): Promise<void>;
}

export function useSearchWidgetState(options: UseSearchWidgetStateOptions): UseSearchWidgetStateResult {
  const [query, setQuery] = useState(options.initialSuggestQuery);
  const [lastSearchQuery, setLastSearchQuery] = useState(options.initialSearchQuery);
  const [locale, setLocale] = useState(options.initialLocale);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [results, setResults] = useState<HybridSearchResult[]>([]);
  const [hotContents, setHotContents] = useState<HotContentItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingHot, setIsLoadingHot] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isSuggestPending, setIsSuggestPending] = useState(false);
  const [trackingId, setTrackingId] = useState("");

  const t = useMemo(() => getTranslations(locale), [locale]);
  const [status, setStatus] = useState<SearchWidgetStatus>({
    message: t.statusInit,
    isError: false,
  });

  const hasAutoSearchedRef = useRef(false);
  const latestSuggestRequestIdRef = useRef(0);
  const isSearchingRef = useRef(false);
  const isSuggestingRef = useRef(false);
  const isLoadingHotRef = useRef(false);

  const updateStatus = useCallback(
    function updateStatus(nextStatus: SearchWidgetStatus): void {
      setStatus(nextStatus);
      options.onStatusChange?.(nextStatus);
    },
    [options.onStatusChange],
  );

  const emitError = useCallback(
    function emitError(error: unknown): void {
      const normalizedError = error instanceof Error ? error : new Error(t.statusError);
      options.onError?.(normalizedError);
      updateStatus({
        message: toReadableStatusMessage(normalizedError, t.statusError),
        isError: true,
      });
    },
    [options.onError, t.statusError, updateStatus],
  );

  const deps = useMemo(
    () => ({
      api: options.api,
      locale,
      query,
      lastSearchQuery,
      suggestLimit: options.suggestLimit,
      searchLimit: options.searchLimit,
      hotLimit: options.hotLimit,
      hotHours: options.hotHours,
      t,
      updateStatus,
      emitError,
      onSuggestionsChange: options.onSuggestionsChange,
      onResultsChange: options.onResultsChange,
      onHotContentsChange: options.onHotContentsChange,
    }),
    [
      emitError,
      lastSearchQuery,
      locale,
      options.api,
      options.hotHours,
      options.hotLimit,
      options.onHotContentsChange,
      options.onResultsChange,
      options.onSuggestionsChange,
      options.searchLimit,
      options.suggestLimit,
      query,
      t,
      updateStatus,
    ],
  );

  const requestHotContents = useCallback(
    async function requestHotContents(source: "auto" | "manual" = "manual"): Promise<void> {
      await requestHotContentsAction(deps, { isLoadingHotRef }, { setHotContents, setIsLoadingHot }, source);
    },
    [deps],
  );

  const requestSuggestions = useCallback(
    async function requestSuggestions(queryOverride?: string, source: "auto" | "manual" = "manual"): Promise<void> {
      await requestSuggestionsAction(
        deps,
        { isSuggestingRef, latestSuggestRequestIdRef },
        { setSuggestions, setIsSuggesting, setIsSuggestPending },
        queryOverride,
        source,
      );
    },
    [deps],
  );

  const debouncedRequestSuggestions = useMemo(
    () => debounce((q: string) => void requestSuggestions(q, "auto"), options.debounceMs),
    [options.debounceMs, requestSuggestions],
  );

  useEffect(() => {
    return () => debouncedRequestSuggestions.cancel();
  }, [debouncedRequestSuggestions]);

  const runSearch = useCallback(
    async function runSearch(queryOverride?: string): Promise<void> {
      await runSearchAction(
        deps,
        { isSearchingRef },
        { setResults, setLastSearchQuery, setIsSearching },
        queryOverride,
      );
    },
    [deps],
  );

  const trackResultClick = useCallback(
    async function trackResultClick(item: HybridSearchResult): Promise<void> {
      await trackResultClickAction(deps, { setTrackingId }, item, requestHotContents);
    },
    [deps, requestHotContents],
  );

  useEffect(
    function autoSuggestByDebounce() {
      const normalizedQuery = query.trim();
      if (!normalizedQuery) {
        setSuggestions([]);
        setIsSuggestPending(false);
        options.onSuggestionsChange?.([]);
        debouncedRequestSuggestions.cancel();
        return;
      }

      setIsSuggestPending(true);
      debouncedRequestSuggestions(normalizedQuery);
    },
    [debouncedRequestSuggestions, options.onSuggestionsChange, query],
  );

  useEffect(
    function autoSearchFromInitialQuery() {
      if (!options.autoSearchOnInit) {
        return;
      }
      if (hasAutoSearchedRef.current) {
        return;
      }

      const initialQuery = options.initialSearchQuery.trim();
      if (!initialQuery) {
        return;
      }

      hasAutoSearchedRef.current = true;
      void runSearch(initialQuery);
    },
    [options.autoSearchOnInit, options.initialSearchQuery, runSearch],
  );

  useEffect(
    function syncQueryStateToUrl() {
      if (!options.syncQueryToUrl) {
        return;
      }

      const nextRelativeUrl = buildRelativeUrlWithQueryState(window.location.href, {
        suggestQuery: query,
        searchQuery: lastSearchQuery,
      });
      const currentRelativeUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

      if (nextRelativeUrl !== currentRelativeUrl) {
        window.history.replaceState(null, "", nextRelativeUrl);
      }
    },
    [lastSearchQuery, options.syncQueryToUrl, query],
  );

  useEffect(
    function loadHotContentsWhenReady() {
      void requestHotContents("auto");
    },
    [requestHotContents],
  );

  return {
    query,
    lastSearchQuery,
    locale,
    suggestions,
    results,
    hotContents,
    isSearching,
    isLoadingHot,
    isSuggesting,
    isSuggestPending,
    trackingId,
    status,
    setQuery,
    setLocale,
    runSearch,
    requestSuggestions,
    requestHotContents,
    trackResultClick,
  };
}
