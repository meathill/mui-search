import { ACTIVE_LOCALE_PACKS, onLocaleChange } from "./active-locale-packs";
import type { LocaleTranslationPack } from "./locale-packs/types";

export interface TranslationText {
  placeholder: string;
  statusInit: string;
  statusError: string;
  statusSuggestNeedKeyword: string;
  statusSearchNeedKeyword: string;
  statusSearching: string;
  statusTrackNeedSearch: string;
  statusHotRefreshed: (count: number) => string;
  statusSuggestRefreshed: (count: number) => string;
  statusSearchRefreshed: (count: number) => string;
  statusClickRecorded: (title: string) => string;
  hotContentsTitle: (hours: number) => string;
  hotContentHitCount: (count: number) => string;
  refreshLoading: string;
  refreshNormal: string;
  clearQuery: string;
  emptyHotContents: string;
  suggestTitle: string;
  emptySuggestions: string;
  searchTitle: string;
  emptySearchResults: string;
}

export type LocaleKey = string;

const FALLBACK_LOCALE = "en";

const translationCache = new Map<string, TranslationText>();
onLocaleChange(function clearTranslationCache() {
  translationCache.clear();
});

export function getTranslations(locale: string): TranslationText {
  const resolvedLocale = resolveLocale(locale);
  const cached = translationCache.get(resolvedLocale);
  if (cached) {
    return cached;
  }
  const pack =
    ACTIVE_LOCALE_PACKS[resolvedLocale] ??
    ACTIVE_LOCALE_PACKS[FALLBACK_LOCALE] ??
    Object.values(ACTIVE_LOCALE_PACKS)[0];
  if (!pack) {
    throw new Error("[search-widget] 没有可用语言包，请先调用 registerLocale");
  }
  const translation = unpackTranslations(pack);
  translationCache.set(resolvedLocale, translation);
  return translation;
}

function unpackTranslations(localePack: LocaleTranslationPack): TranslationText {
  const {
    placeholder,
    statusInit,
    statusError,
    statusSuggestNeedKeyword,
    statusSearchNeedKeyword,
    statusSearching,
    statusTrackNeedSearch,
    statusHotRefreshedTemplate,
    statusSuggestRefreshedTemplate,
    statusSearchRefreshedTemplate,
    statusClickRecordedTemplate,
    hotContentsTitleTemplate,
    hotContentHitCountTemplate,
    refreshLoading,
    refreshNormal,
    clearQuery,
    emptyHotContents,
    suggestTitle,
    emptySuggestions,
    searchTitle,
    emptySearchResults,
  } = localePack;

  return {
    placeholder,
    statusInit,
    statusError,
    statusSuggestNeedKeyword,
    statusSearchNeedKeyword,
    statusSearching,
    statusTrackNeedSearch,
    statusHotRefreshed: function statusHotRefreshed(count: number) {
      return interpolate(statusHotRefreshedTemplate, { count });
    },
    statusSuggestRefreshed: function statusSuggestRefreshed(count: number) {
      return interpolate(statusSuggestRefreshedTemplate, { count });
    },
    statusSearchRefreshed: function statusSearchRefreshed(count: number) {
      return interpolate(statusSearchRefreshedTemplate, { count });
    },
    statusClickRecorded: function statusClickRecorded(title: string) {
      return interpolate(statusClickRecordedTemplate, { title });
    },
    hotContentsTitle: function hotContentsTitle(hours: number) {
      return interpolate(hotContentsTitleTemplate, { hours });
    },
    hotContentHitCount: function hotContentHitCount(count: number) {
      return interpolate(hotContentHitCountTemplate, { count });
    },
    refreshLoading,
    refreshNormal,
    clearQuery,
    emptyHotContents,
    suggestTitle,
    emptySuggestions,
    searchTitle,
    emptySearchResults,
  };
}

function resolveLocale(locale: string): LocaleKey {
  const normalized = locale.toLowerCase();
  const language = normalized.split("-")[0];

  if ((normalized === "zh-hk" || normalized === "zh-tw") && isWidgetLocale("zh")) {
    return "zh";
  }
  if (normalized === "zh-cn" && isWidgetLocale("cn")) {
    return "cn";
  }
  if ((normalized === "en" || normalized.startsWith("en-")) && isWidgetLocale("en")) {
    return "en";
  }
  if ((normalized === "cn" || normalized.startsWith("cn-")) && isWidgetLocale("cn")) {
    return "cn";
  }
  if (isWidgetLocale(normalized)) {
    return normalized;
  }
  if (language && isWidgetLocale(language)) {
    return language;
  }

  return FALLBACK_LOCALE;
}

function isWidgetLocale(locale: string): boolean {
  return Object.hasOwn(ACTIVE_LOCALE_PACKS, locale);
}

function interpolate(template: string, params: Record<string, string | number>): string {
  let nextText = template;
  for (const [key, value] of Object.entries(params)) {
    nextText = nextText.replaceAll(`{${key}}`, String(value));
  }
  return nextText;
}
