import type { HotContentItem, HotQueryItem, HybridSearchResult, SuggestionItem } from "@mui-search/shared";
import type { LocaleOption } from "./constants";

export type SearchWidgetMountTarget = string | HTMLElement;

export interface SearchWidgetStatus {
  message: string;
  isError: boolean;
}

export interface SuggestParams {
  query: string;
  limit?: number;
  locale?: string;
}

export interface SearchParams {
  query: string;
  limit?: number;
  locale?: string;
}

export interface HotParams {
  locale?: string;
  limit?: number;
  hours?: number;
}

export interface TrackClickParams {
  query: string;
  locale?: string;
  contentId: string;
  contentTitle: string;
  contentLocale?: string;
}

export interface SearchApi {
  apiBaseUrl: string;
  suggest(params: SuggestParams): Promise<SuggestionItem[]>;
  search(params: SearchParams): Promise<HybridSearchResult[]>;
  hot(params: HotParams): Promise<HotContentItem[]>;
  hotQueries(params: HotParams): Promise<HotQueryItem[]>;
  trackClick(params: TrackClickParams): Promise<void>;
}

export interface SearchWidgetState {
  query: string;
  locale: string;
  suggestions: SuggestionItem[];
  results: HybridSearchResult[];
  hotContents: HotContentItem[];
  isSearching: boolean;
  isLoadingHot: boolean;
  isSuggesting: boolean;
  status: SearchWidgetStatus;
}

export interface SearchWidgetHandle {
  destroy(): void;
  search(query: string): Promise<void>;
  setQuery(query: string): void;
  setLocale(locale: string): void;
  getState(): SearchWidgetState;
}

export interface SearchWidgetOptions {
  mount: SearchWidgetMountTarget;
  apiBaseUrl?: string;
  siteUrl?: string;
  locale?: string;
  suggestLimit?: number;
  searchLimit?: number;
  hotLimit?: number;
  hotHours?: number;
  debounceMs?: number;
  requestTimeoutMs?: number;
  localeOptions?: LocaleOption[];
  placeholder?: string;
  syncQueryToUrl?: boolean;
  autoSearchOnInit?: boolean;
  initialQuery?: string;
  initialSearchQuery?: string;
  onStatusChange?(status: SearchWidgetStatus): void;
  onSuggestionsChange?(suggestions: SuggestionItem[]): void;
  onResultsChange?(results: HybridSearchResult[]): void;
  onHotContentsChange?(hotContents: HotContentItem[]): void;
  onError?(error: Error): void;
}

export interface SearchWidgetController {
  search(query: string): Promise<void>;
  setQuery(query: string): void;
  setLocale(locale: string): void;
  getState(): SearchWidgetState;
}
