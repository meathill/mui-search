import { useCallback } from "react";
import type { HotContentItem } from "@mui-search/shared";
import { formatError, parseHoursInput, parseLimitInput, setStatusMessage } from "../app-utils";
import { HOT_HOURS, HOT_LIMIT } from "../constants";
import type { HotRequestSource } from "../playground-types";
import { fetchHourlyHotContents } from "../requests";

interface UseRequestHotContentsOptions {
  apiBaseUrl: string;
  localeFilter: string;
  hotLimitInput: string;
  hotHoursInput: string;
  setHotContents(value: HotContentItem[]): void;
  setStatusText(value: string): void;
  setIsStatusError(value: boolean): void;
  setIsLoadingHot(value: boolean): void;
}

export function useRequestHotContents(options: UseRequestHotContentsOptions) {
  const {
    apiBaseUrl,
    localeFilter,
    hotLimitInput,
    hotHoursInput,
    setHotContents,
    setStatusText,
    setIsStatusError,
    setIsLoadingHot,
  } = options;

  return useCallback(
    async function requestHotContents(source: HotRequestSource): Promise<void> {
      const limit = parseLimitInput(hotLimitInput, HOT_LIMIT);
      const hours = parseHoursInput(hotHoursInput, HOT_HOURS);

      setIsLoadingHot(true);
      try {
        const result = await fetchHourlyHotContents({
          apiBaseUrl,
          locale: localeFilter,
          limit,
          hours,
        });

        setHotContents(result.payload.data);

        if (source === "manual") {
          setStatusMessage(
            `Hot list refresh completed with ${result.payload.data.length} item(s) (HTTP ${result.status}, ${result.durationMs}ms).`,
            false,
            setStatusText,
            setIsStatusError,
          );
        }
      } catch (error) {
        if (source === "manual") {
          setStatusMessage(`Hot list request failed: ${formatError(error)}`, true, setStatusText, setIsStatusError);
        }
      } finally {
        setIsLoadingHot(false);
      }
    },
    [
      apiBaseUrl,
      hotHoursInput,
      hotLimitInput,
      localeFilter,
      setHotContents,
      setIsLoadingHot,
      setIsStatusError,
      setStatusText,
    ],
  );
}
