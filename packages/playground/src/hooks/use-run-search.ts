import { useCallback } from "react";
import type { HybridSearchResult } from "@mui-search/shared";
import { formatError, parseLimitInput, setStatusMessage } from "../app-utils";
import { SEARCH_LIMIT } from "../constants";
import { fetchSearchResults } from "../requests";

interface UseRunSearchOptions {
  apiBaseUrl: string;
  localeFilter: string;
  query: string;
  searchLimitInput: string;
  setQuery(value: string): void;
  setResults(value: HybridSearchResult[]): void;
  setStatusText(value: string): void;
  setIsStatusError(value: boolean): void;
  setIsSearching(value: boolean): void;
  setLastSearchQuery(value: string): void;
  setLastSearchLocale(value: string): void;
  requestHotContents(source: "auto" | "manual"): Promise<void>;
}

export function useRunSearch(options: UseRunSearchOptions) {
  const {
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
  } = options;

  return useCallback(
    async function runSearch(queryOverride?: string): Promise<void> {
      const normalizedQuery = (queryOverride ?? query).trim();
      if (!normalizedQuery) {
        setStatusMessage("Enter a query before running search.", true, setStatusText, setIsStatusError);
        return;
      }

      const limit = parseLimitInput(searchLimitInput, SEARCH_LIMIT);
      if (normalizedQuery !== query) {
        setQuery(normalizedQuery);
      }
      setLastSearchQuery(normalizedQuery);
      setLastSearchLocale(localeFilter);
      setIsSearching(true);
      setStatusMessage("Running hybrid search...", false, setStatusText, setIsStatusError);

      try {
        const result = await fetchSearchResults({
          apiBaseUrl,
          query: normalizedQuery,
          locale: localeFilter,
          limit,
        });

        setResults(result.payload.data);

        if (result.payload.data.length === 0) {
          setStatusMessage("No matching results found.", false, setStatusText, setIsStatusError);
        } else {
          setStatusMessage(
            `Search completed with ${result.payload.data.length} result(s) (HTTP ${result.status}, ${result.durationMs}ms). Click "Track Click" on a result to include it in hot rankings.`,
            false,
            setStatusText,
            setIsStatusError,
          );
        }

        void requestHotContents("auto");
      } catch (error) {
        setStatusMessage(`Search failed: ${formatError(error)}`, true, setStatusText, setIsStatusError);
      } finally {
        setIsSearching(false);
      }
    },
    [
      apiBaseUrl,
      localeFilter,
      query,
      requestHotContents,
      searchLimitInput,
      setIsSearching,
      setIsStatusError,
      setLastSearchLocale,
      setLastSearchQuery,
      setQuery,
      setResults,
      setStatusText,
    ],
  );
}
