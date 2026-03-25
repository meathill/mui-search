import {
  type HotContentItem,
  type HybridSearchResult,
  SEARCH_QUERY_MIN_LENGTH,
  type SuggestionItem,
} from "@mui-search/shared";
import type { SearchApi, SearchWidgetStatus, TrackClickParams } from "./types";

export interface RequestDeps {
  api: SearchApi;
  locale: string;
  query: string;
  lastSearchQuery: string;
  suggestLimit: number;
  searchLimit: number;
  hotLimit: number;
  hotHours: number;
  t: {
    statusError: string;
    statusHotRefreshed(count: number): string;
    statusSuggestNeedKeyword: string;
    statusSuggestRefreshed(count: number): string;
    statusSearchNeedKeyword: string;
    statusSearching: string;
    statusSearchRefreshed(count: number): string;
    statusTrackNeedSearch: string;
    statusClickRecorded(title: string): string;
  };
  updateStatus(status: SearchWidgetStatus): void;
  emitError(error: unknown): void;
  onSuggestionsChange?(suggestions: SuggestionItem[]): void;
  onResultsChange?(results: HybridSearchResult[]): void;
  onHotContentsChange?(hotContents: HotContentItem[]): void;
}

export interface RequestSuggestionsCallbacks {
  setSuggestions(suggestions: SuggestionItem[]): void;
  setIsSuggesting(value: boolean): void;
  setIsSuggestPending(value: boolean): void;
}

export interface RequestSuggestionsRefs {
  isSuggestingRef: { current: boolean };
  latestSuggestRequestIdRef: { current: number };
}

export async function requestSuggestionsAction(
  deps: RequestDeps,
  refs: RequestSuggestionsRefs,
  callbacks: RequestSuggestionsCallbacks,
  queryOverride?: string,
  source: "auto" | "manual" = "manual",
): Promise<void> {
  const normalizedQuery = (queryOverride ?? deps.query).trim();
  if (!normalizedQuery) {
    callbacks.setSuggestions([]);
    callbacks.setIsSuggestPending(false);
    deps.onSuggestionsChange?.([]);
    if (source === "manual") {
      deps.updateStatus({
        message: deps.t.statusSuggestNeedKeyword,
        isError: true,
      });
    }
    return;
  }

  if (refs.isSuggestingRef.current) return;

  const requestId = refs.latestSuggestRequestIdRef.current + 1;
  refs.latestSuggestRequestIdRef.current = requestId;

  refs.isSuggestingRef.current = true;
  callbacks.setIsSuggesting(true);
  callbacks.setIsSuggestPending(true);

  try {
    const nextSuggestions = await deps.api.suggest({
      query: normalizedQuery,
      limit: deps.suggestLimit,
      locale: deps.locale,
    });

    if (requestId !== refs.latestSuggestRequestIdRef.current) {
      return;
    }

    callbacks.setSuggestions(nextSuggestions);
    deps.onSuggestionsChange?.(nextSuggestions);
    if (source === "manual") {
      deps.updateStatus({
        message: deps.t.statusSuggestRefreshed(nextSuggestions.length),
        isError: false,
      });
    }
  } catch (error) {
    if (requestId !== refs.latestSuggestRequestIdRef.current) {
      return;
    }

    deps.emitError(error);
  } finally {
    if (requestId === refs.latestSuggestRequestIdRef.current) {
      refs.isSuggestingRef.current = false;
      callbacks.setIsSuggesting(false);
      callbacks.setIsSuggestPending(false);
    }
  }
}

export interface RequestHotContentsCallbacks {
  setHotContents(hotContents: HotContentItem[]): void;
  setIsLoadingHot(value: boolean): void;
}

export interface RequestHotContentsRefs {
  isLoadingHotRef: { current: boolean };
}

export async function requestHotContentsAction(
  deps: RequestDeps,
  refs: RequestHotContentsRefs,
  callbacks: RequestHotContentsCallbacks,
  source: "auto" | "manual" = "manual",
): Promise<void> {
  if (refs.isLoadingHotRef.current) return;
  refs.isLoadingHotRef.current = true;
  callbacks.setIsLoadingHot(true);
  try {
    const nextHotContents = await deps.api.hot({
      locale: deps.locale,
      limit: deps.hotLimit,
      hours: deps.hotHours,
    });

    callbacks.setHotContents(nextHotContents);
    deps.onHotContentsChange?.(nextHotContents);

    if (source === "manual") {
      deps.updateStatus({
        message: deps.t.statusHotRefreshed(nextHotContents.length),
        isError: false,
      });
    }
  } catch (error) {
    if (source === "manual") {
      deps.emitError(error);
    }
  } finally {
    refs.isLoadingHotRef.current = false;
    callbacks.setIsLoadingHot(false);
  }
}

export interface RunSearchCallbacks {
  setResults(results: HybridSearchResult[]): void;
  setLastSearchQuery(query: string): void;
  setIsSearching(value: boolean): void;
}

export interface RunSearchRefs {
  isSearchingRef: { current: boolean };
}

export async function runSearchAction(
  deps: RequestDeps,
  refs: RunSearchRefs,
  callbacks: RunSearchCallbacks,
  queryOverride?: string,
): Promise<void> {
  if (refs.isSearchingRef.current) return;

  const normalizedQuery = (queryOverride ?? deps.query).trim();
  if (!normalizedQuery) {
    deps.updateStatus({
      message: deps.t.statusSearchNeedKeyword,
      isError: true,
    });
    return;
  }
  if (normalizedQuery.length < SEARCH_QUERY_MIN_LENGTH) {
    deps.updateStatus({
      message: `${deps.t.statusSearchNeedKeyword} (min ${SEARCH_QUERY_MIN_LENGTH})`,
      isError: true,
    });
    return;
  }

  refs.isSearchingRef.current = true;
  callbacks.setIsSearching(true);
  deps.updateStatus({
    message: deps.t.statusSearching,
    isError: false,
  });

  try {
    const nextResults = await deps.api.search({
      query: normalizedQuery,
      limit: deps.searchLimit,
      locale: deps.locale,
    });

    callbacks.setResults(nextResults);
    callbacks.setLastSearchQuery(normalizedQuery);
    deps.onResultsChange?.(nextResults);
    deps.updateStatus({
      message: deps.t.statusSearchRefreshed(nextResults.length),
      isError: false,
    });
  } catch (error) {
    deps.emitError(error);
  } finally {
    refs.isSearchingRef.current = false;
    callbacks.setIsSearching(false);
  }
}

export interface TrackResultClickCallbacks {
  setTrackingId(id: string): void;
}

export async function trackResultClickAction(
  deps: RequestDeps,
  callbacks: TrackResultClickCallbacks,
  item: HybridSearchResult,
  requestHotContents: (source: "auto" | "manual") => Promise<void>,
): Promise<void> {
  const effectiveQuery = deps.lastSearchQuery.trim();
  if (!effectiveQuery) {
    deps.updateStatus({
      message: deps.t.statusTrackNeedSearch,
      isError: true,
    });
    return;
  }

  callbacks.setTrackingId(item.id);
  try {
    const trackPayload: TrackClickParams = {
      query: effectiveQuery,
      locale: deps.locale,
      contentId: item.id,
      contentTitle: item.title,
    };
    if (item.locale) {
      trackPayload.contentLocale = item.locale;
    }

    await deps.api.trackClick(trackPayload);
    deps.updateStatus({
      message: deps.t.statusClickRecorded(item.title),
      isError: false,
    });
    await requestHotContents("auto");
  } catch (error) {
    deps.emitError(error);
  } finally {
    callbacks.setTrackingId("");
  }
}

export function toReadableStatusMessage(error: Error, fallbackMessage: string): string {
  const message = error.message.trim();
  if (!message) {
    return fallbackMessage;
  }

  // 避免把服务端原始 payload、JSON 片段或堆栈样式文本直接渲染到前端状态区。
  if (message.includes("{") || message.includes("}") || message.includes("[object")) {
    return fallbackMessage;
  }

  return message;
}
