import { ACTIVE_LOCALE_PACKS } from "./active-locale-packs";
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

const AVAILABLE_LOCALES = Object.keys(ACTIVE_LOCALE_PACKS);
const AVAILABLE_LOCALE_SET = new Set(AVAILABLE_LOCALES);
const FALLBACK_LOCALE = "en";
const DEFAULT_FALLBACK_LOCALE = AVAILABLE_LOCALE_SET.has(FALLBACK_LOCALE)
  ? FALLBACK_LOCALE
  : (AVAILABLE_LOCALES[0] ?? FALLBACK_LOCALE);

export const translations = buildTranslations();

export function getTranslations(locale: string): TranslationText {
  const resolvedLocale = resolveLocale(locale);
  const translation = translations[resolvedLocale] ?? translations[DEFAULT_FALLBACK_LOCALE];
  if (!translation) {
    throw new Error("[search-widget] 无法解析语言文案，请检查翻译配置");
  }
  return translation;
}

function buildTranslations(): Record<LocaleKey, TranslationText> {
  const localeEntries: [string, TranslationText][] = [];

  for (const locale of AVAILABLE_LOCALES) {
    const localePack = ACTIVE_LOCALE_PACKS[locale];
    if (!localePack) {
      continue;
    }
    localeEntries.push([locale, unpackTranslations(localePack)]);
  }

  if (localeEntries.length === 0) {
    throw new Error("[search-widget] 没有可用语言包，请检查 ACTIVE_LOCALE_PACKS 配置");
  }

  return Object.fromEntries(localeEntries);
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

  return DEFAULT_FALLBACK_LOCALE;
}

function isWidgetLocale(locale: string): boolean {
  return AVAILABLE_LOCALE_SET.has(locale);
}

function interpolate(template: string, params: Record<string, string | number>): string {
  let nextText = template;
  for (const [key, value] of Object.entries(params)) {
    nextText = nextText.replaceAll(`{${key}}`, String(value));
  }
  return nextText;
}
