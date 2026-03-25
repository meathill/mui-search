export const DEFAULT_LOCALE = "all";

export const SUGGESTION_LIMIT = 8;
export const SEARCH_LIMIT = 10;
export const HOT_LIMIT = 12;
export const HOT_HOURS = 24;
export const SUGGESTION_CACHE_SIZE = 150;
export const DEBOUNCE_DELAY_MS = 300;

export interface LocaleOption {
  value: string;
  label: string;
}

export const LOCALE_OPTIONS: LocaleOption[] = [
  { value: "all", label: "all (All locales)" },
  { value: "en", label: "en (English)" },
  { value: "zh", label: "zh (Chinese)" },
  { value: "cn", label: "cn (Legacy Simplified Chinese code)" },
  { value: "ja", label: "ja (Japanese)" },
  { value: "ko", label: "ko (Korean)" },
];
