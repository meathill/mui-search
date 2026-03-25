import { useCallback } from "react";
import type { SuggestionItem } from "@mui-search/shared";
import { buildSuggestionCacheKey, formatError, parseLimitInput, setStatusMessage } from "../app-utils";
import { SUGGESTION_LIMIT } from "../constants";
import type { LruCache } from "../lru-cache";
import type { SuggestRequestSource } from "../playground-types";
import { fetchSuggestions } from "../requests";

interface UseRequestSuggestionsOptions {
  apiBaseUrl: string;
  localeFilter: string;
  query: string;
  suggestLimitInput: string;
  suggestionCacheRef: React.MutableRefObject<LruCache<string, SuggestionItem[]>>;
  latestSuggestRequestIdRef: React.MutableRefObject<number>;
  setSuggestions(value: SuggestionItem[]): void;
  setStatusText(value: string): void;
  setIsStatusError(value: boolean): void;
}

export function useRequestSuggestions(options: UseRequestSuggestionsOptions) {
  const {
    apiBaseUrl,
    localeFilter,
    query,
    suggestLimitInput,
    suggestionCacheRef,
    latestSuggestRequestIdRef,
    setSuggestions,
    setStatusText,
    setIsStatusError,
  } = options;

  return useCallback(
    async function requestSuggestions(source: SuggestRequestSource, queryOverride?: string): Promise<void> {
      const normalizedQuery = (queryOverride ?? query).trim();
      if (!normalizedQuery) {
        setSuggestions([]);
        const message =
          source === "manual" ? "Enter a query before requesting suggestions." : "Enter a query to continue.";
        setStatusMessage(message, source === "manual", setStatusText, setIsStatusError);
        return;
      }

      const limit = parseLimitInput(suggestLimitInput, SUGGESTION_LIMIT);
      const cacheKey = buildSuggestionCacheKey(normalizedQuery, limit, localeFilter);
      const cachedSuggestions = suggestionCacheRef.current.get(cacheKey);
      if (cachedSuggestions) {
        setSuggestions(cachedSuggestions);
        const hitMessage = source === "manual" ? "Suggestions hit local cache." : "Auto suggestions hit local cache.";
        setStatusMessage(hitMessage, false, setStatusText, setIsStatusError);
        return;
      }

      const requestId = latestSuggestRequestIdRef.current + 1;
      latestSuggestRequestIdRef.current = requestId;

      try {
        const result = await fetchSuggestions({
          apiBaseUrl,
          query: normalizedQuery,
          limit,
          locale: localeFilter,
        });

        if (requestId !== latestSuggestRequestIdRef.current) {
          return;
        }

        suggestionCacheRef.current.set(cacheKey, result.payload.suggestions);
        setSuggestions(result.payload.suggestions);

        if (result.payload.suggestions.length === 0) {
          setStatusMessage(
            "No suggestions found. You can run search directly.",
            false,
            setStatusText,
            setIsStatusError,
          );
          return;
        }

        const doneMessage =
          source === "manual"
            ? `Manual suggestion request completed with ${result.payload.suggestions.length} item(s) (HTTP ${result.status}, ${result.durationMs}ms).`
            : `Auto suggestion refresh completed with ${result.payload.suggestions.length} item(s) (HTTP ${result.status}, ${result.durationMs}ms).`;
        setStatusMessage(doneMessage, false, setStatusText, setIsStatusError);
      } catch (error) {
        if (requestId !== latestSuggestRequestIdRef.current) {
          return;
        }

        const errorMessage =
          source === "manual"
            ? `Suggestion request failed: ${formatError(error)}`
            : `Auto suggestion failed: ${formatError(error)}`;
        setStatusMessage(errorMessage, true, setStatusText, setIsStatusError);
      }
    },
    [
      apiBaseUrl,
      latestSuggestRequestIdRef,
      localeFilter,
      query,
      setIsStatusError,
      setStatusText,
      setSuggestions,
      suggestLimitInput,
      suggestionCacheRef,
    ],
  );
}
