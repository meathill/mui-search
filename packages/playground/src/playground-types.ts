import type { FormEvent } from "react";

import type { HotContentItem, HybridSearchResult, SuggestionItem } from "@mui-search/shared";

export type SuggestRequestSource = "auto" | "manual";
export type HotRequestSource = "auto" | "manual";

export interface PlaygroundState {
  apiBaseUrl: string;
  localeFilter: string;
  query: string;
  suggestLimitInput: string;
  searchLimitInput: string;
  hotLimitInput: string;
  hotHoursInput: string;
  suggestions: SuggestionItem[];
  results: HybridSearchResult[];
  hotContents: HotContentItem[];
  statusText: string;
  isStatusError: boolean;
  isSearching: boolean;
  isLoadingHot: boolean;
  isTrackingResultId: string;
  onSubmitSearch(event: FormEvent<HTMLFormElement>): void;
  onClickSuggest(): void;
  onClickRefreshHot(): void;
  onApplySuggestion(text: string): void;
  onTrackResultClick(item: HybridSearchResult): void;
  onApiBaseUrlChange(value: string): void;
  onLocaleChange(value: string): void;
  onQueryChange(value: string): void;
  onSuggestLimitChange(value: string): void;
  onSearchLimitChange(value: string): void;
  onHotLimitChange(value: string): void;
  onHotHoursChange(value: string): void;
}
