import type { Dispatch, SetStateAction } from "react";

import type { HybridSearchResult } from "@mui-search/shared";
import { formatError, setStatusMessage } from "./app-utils";
import { trackSearchClick } from "./requests";

interface TrackResultClickOptions {
  item: HybridSearchResult;
  apiBaseUrl: string;
  lastSearchQuery: string;
  query: string;
  lastSearchLocale: string;
  localeFilter: string;
  setIsTrackingResultId: Dispatch<SetStateAction<string>>;
  setStatusText: Dispatch<SetStateAction<string>>;
  setIsStatusError: Dispatch<SetStateAction<boolean>>;
  requestHotContents(): Promise<void>;
}

export async function submitResultClickTracking(options: TrackResultClickOptions): Promise<void> {
  const effectiveQuery = options.lastSearchQuery || options.query.trim();
  if (!effectiveQuery) {
    setStatusMessage("Run a search before tracking clicks.", true, options.setStatusText, options.setIsStatusError);
    return;
  }

  const effectiveLocale = options.lastSearchLocale || options.localeFilter;

  options.setIsTrackingResultId(options.item.id);
  try {
    const clickRequest = {
      apiBaseUrl: options.apiBaseUrl,
      query: effectiveQuery,
      locale: effectiveLocale,
      contentId: options.item.id,
      contentTitle: options.item.title,
      ...(options.item.locale ? { contentLocale: options.item.locale } : {}),
    };

    const result = await trackSearchClick(clickRequest);

    setStatusMessage(
      `Click tracked (HTTP ${result.status}, ${result.durationMs}ms). It will appear in hot snapshots after scheduled aggregation; refresh the hot list later to verify.`,
      false,
      options.setStatusText,
      options.setIsStatusError,
    );

    await options.requestHotContents();
  } catch (error) {
    setStatusMessage(
      `Click tracking failed: ${formatError(error)}`,
      true,
      options.setStatusText,
      options.setIsStatusError,
    );
  } finally {
    options.setIsTrackingResultId("");
  }
}
