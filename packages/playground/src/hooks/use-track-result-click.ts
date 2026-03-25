import { useCallback } from "react";
import type { HybridSearchResult } from "@mui-search/shared";
import type { HotRequestSource } from "../playground-types";
import { submitResultClickTracking } from "../track-result-click";

interface UseTrackResultClickOptions {
  apiBaseUrl: string;
  localeFilter: string;
  query: string;
  lastSearchQuery: string;
  lastSearchLocale: string;
  setIsTrackingResultId: React.Dispatch<React.SetStateAction<string>>;
  setStatusText: React.Dispatch<React.SetStateAction<string>>;
  setIsStatusError: React.Dispatch<React.SetStateAction<boolean>>;
  requestHotContents(source: HotRequestSource): Promise<void>;
}

export function useTrackResultClick(options: UseTrackResultClickOptions) {
  const {
    apiBaseUrl,
    localeFilter,
    query,
    lastSearchQuery,
    lastSearchLocale,
    setIsTrackingResultId,
    setStatusText,
    setIsStatusError,
    requestHotContents,
  } = options;

  return useCallback(
    function onTrackResultClick(item: HybridSearchResult): void {
      void submitResultClickTracking({
        item,
        apiBaseUrl,
        lastSearchQuery,
        query,
        lastSearchLocale,
        localeFilter,
        setIsTrackingResultId,
        setStatusText,
        setIsStatusError,
        requestHotContents: async function requestHotContentsAfterClick(): Promise<void> {
          await requestHotContents("auto");
        },
      });
    },
    [
      apiBaseUrl,
      lastSearchLocale,
      lastSearchQuery,
      localeFilter,
      query,
      requestHotContents,
      setIsStatusError,
      setIsTrackingResultId,
      setStatusText,
    ],
  );
}
