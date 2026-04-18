/** @jsxImportSource preact */
import { render } from "preact";

import {
  DEFAULT_DEBOUNCE_MS,
  DEFAULT_HOT_HOURS,
  DEFAULT_HOT_LIMIT,
  DEFAULT_LOCALE,
  DEFAULT_LOCALE_OPTIONS,
  DEFAULT_SEARCH_LIMIT,
  DEFAULT_SITE_URL,
  DEFAULT_SUGGEST_LIMIT,
} from "./constants";
import { normalizeSiteUrl } from "./content-target-url";
import { getTranslations } from "./locales";
import { readQueryStateFromUrl } from "./query-state";
import { createSearchApi } from "./search-api";
import { SearchWidgetApp } from "./search-widget-app";
import type { SearchWidgetController, SearchWidgetHandle, SearchWidgetMountTarget, SearchWidgetOptions } from "./types";

interface NormalizedSearchWidgetOptions {
  mountElement: HTMLElement;
  apiBaseUrl: string;
  siteUrl: string;
  locale: string;
  suggestLimit: number;
  searchLimit: number;
  hotLimit: number;
  hotHours: number;
  debounceMs: number;
  placeholder: string;
  syncQueryToUrl: boolean;
  autoSearchOnInit: boolean;
  initialSuggestQuery: string;
  initialSearchQuery: string;
}

export function mountSearchWidget(options: SearchWidgetOptions): SearchWidgetHandle {
  const normalizedOptions = normalizeOptions(options);

  const apiConfig: {
    apiBaseUrl: string;
    requestTimeoutMs?: number;
  } = {
    apiBaseUrl: normalizedOptions.apiBaseUrl,
  };
  if (options.requestTimeoutMs !== undefined) {
    apiConfig.requestTimeoutMs = options.requestTimeoutMs;
  }

  const api = createSearchApi(apiConfig);

  let controller: SearchWidgetController | null = null;

  render(
    <SearchWidgetApp
      api={api}
      siteUrl={normalizedOptions.siteUrl}
      localeOptions={options.localeOptions ?? DEFAULT_LOCALE_OPTIONS}
      initialLocale={normalizedOptions.locale}
      suggestLimit={normalizedOptions.suggestLimit}
      searchLimit={normalizedOptions.searchLimit}
      hotLimit={normalizedOptions.hotLimit}
      hotHours={normalizedOptions.hotHours}
      debounceMs={normalizedOptions.debounceMs}
      placeholder={normalizedOptions.placeholder}
      syncQueryToUrl={normalizedOptions.syncQueryToUrl}
      autoSearchOnInit={normalizedOptions.autoSearchOnInit}
      initialSuggestQuery={normalizedOptions.initialSuggestQuery}
      initialSearchQuery={normalizedOptions.initialSearchQuery}
      bindController={function bindController(nextController) {
        controller = nextController;
      }}
      {...(options.onStatusChange
        ? {
            onStatusChange: options.onStatusChange,
          }
        : {})}
      {...(options.onSuggestionsChange
        ? {
            onSuggestionsChange: options.onSuggestionsChange,
          }
        : {})}
      {...(options.onResultsChange
        ? {
            onResultsChange: options.onResultsChange,
          }
        : {})}
      {...(options.onHotContentsChange
        ? {
            onHotContentsChange: options.onHotContentsChange,
          }
        : {})}
      {...(options.onError
        ? {
            onError: options.onError,
          }
        : {})}
    />,
    normalizedOptions.mountElement,
  );

  return {
    destroy() {
      render(null, normalizedOptions.mountElement);
      controller = null;
    },
    search(query: string) {
      return getController(controller).search(query);
    },
    setQuery(query: string) {
      getController(controller).setQuery(query);
    },
    setLocale(locale: string) {
      getController(controller).setLocale(locale);
    },
    getState() {
      return getController(controller).getState();
    },
  };
}

export { createSearchApi } from "./search-api";
export type * from "./types";

function getController(controller: SearchWidgetController | null): SearchWidgetController {
  if (!controller) {
    throw new Error("search widget 尚未初始化完成");
  }

  return controller;
}

function normalizeOptions(options: SearchWidgetOptions): NormalizedSearchWidgetOptions {
  const mountElement = resolveMountElement(options.mount);
  const apiBaseUrl = options.apiBaseUrl?.trim() || (process.env.PUBLIC_URL as string) || window.location.origin;
  const siteUrl = normalizeSiteUrlValue(options.siteUrl);
  const locale = normalizeLocale(options.locale);
  const suggestLimit = normalizeLimit(options.suggestLimit, DEFAULT_SUGGEST_LIMIT);
  const searchLimit = normalizeLimit(options.searchLimit, DEFAULT_SEARCH_LIMIT);
  const hotLimit = normalizeLimit(options.hotLimit, DEFAULT_HOT_LIMIT);
  const hotHours = normalizeLimit(options.hotHours, DEFAULT_HOT_HOURS);
  const debounceMs = normalizeLimit(options.debounceMs, DEFAULT_DEBOUNCE_MS);

  const t = getTranslations(locale);
  const placeholder = options.placeholder?.trim() || t.placeholder;

  const syncQueryToUrl = options.syncQueryToUrl === true;
  const autoSearchOnInit = options.autoSearchOnInit !== false;

  const queryState = syncQueryToUrl
    ? readQueryStateFromUrl(window.location.href)
    : {
        suggestQuery: "",
        searchQuery: "",
      };

  const initialSuggestQuery = options.initialQuery?.trim() || queryState.suggestQuery || queryState.searchQuery;
  const initialSearchQuery = options.initialSearchQuery?.trim() || queryState.searchQuery;

  return {
    mountElement,
    apiBaseUrl,
    siteUrl,
    locale,
    suggestLimit,
    searchLimit,
    hotLimit,
    hotHours,
    debounceMs,
    placeholder,
    syncQueryToUrl,
    autoSearchOnInit,
    initialSuggestQuery,
    initialSearchQuery,
  };
}

function resolveMountElement(target: SearchWidgetMountTarget): HTMLElement {
  if (typeof target === "string") {
    const element = document.querySelector<HTMLElement>(target);
    if (!element) {
      throw new Error(`未找到挂载节点：${target}`);
    }

    return element;
  }

  return target;
}

function normalizeLocale(rawLocale: string | undefined): string {
  const locale = rawLocale?.trim().toLowerCase();
  if (!locale) {
    return DEFAULT_LOCALE;
  }

  return locale;
}

function normalizeLimit(rawLimit: number | undefined, fallback: number): number {
  if (rawLimit === undefined) {
    return fallback;
  }

  const normalized = Math.trunc(rawLimit);
  if (!Number.isFinite(normalized) || normalized <= 0) {
    return fallback;
  }

  return normalized;
}

function normalizeSiteUrlValue(rawSiteUrl: string | undefined): string {
  const siteUrl = rawSiteUrl?.trim() || DEFAULT_SITE_URL;
  try {
    return normalizeSiteUrl(siteUrl);
  } catch {
    return DEFAULT_SITE_URL;
  }
}

