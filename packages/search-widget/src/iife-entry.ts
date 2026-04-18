import { registerLocale } from "./active-locale-packs";
import { mountSearchWidget } from "./search-entry";
import type { SearchWidgetOptions } from "./types";

declare global {
  interface Window {
    MuiSearchWidget?: {
      mount: typeof mountSearchWidget;
      registerLocale: typeof registerLocale;
    };
  }
}

function parseBooleanDataAttribute(rawValue: string | undefined): boolean | undefined {
  if (rawValue === undefined) {
    return undefined;
  }

  const normalized = rawValue.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return undefined;
}

function autoInit() {
  const elements = document.querySelectorAll<HTMLElement>("[data-mui-search]");
  if (elements.length === 0) {
    return;
  }

  for (const element of elements) {
    const dataset = element.dataset;
    const options: SearchWidgetOptions = { mount: element };
    if (dataset.apiBaseUrl) options.apiBaseUrl = dataset.apiBaseUrl;
    if (dataset.siteUrl) options.siteUrl = dataset.siteUrl;
    if (dataset.locale) options.locale = dataset.locale;
    if (dataset.suggestLimit) options.suggestLimit = parseInt(dataset.suggestLimit, 10);
    if (dataset.searchLimit) options.searchLimit = parseInt(dataset.searchLimit, 10);
    if (dataset.hotLimit) options.hotLimit = parseInt(dataset.hotLimit, 10);
    if (dataset.hotHours) options.hotHours = parseInt(dataset.hotHours, 10);
    const syncQueryToUrl = parseBooleanDataAttribute(dataset.syncQueryToUrl);
    if (syncQueryToUrl !== undefined) options.syncQueryToUrl = syncQueryToUrl;

    mountSearchWidget(options);
  }
}

if (typeof window !== "undefined") {
  window.MuiSearchWidget = {
    mount: mountSearchWidget,
    registerLocale,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoInit);
  } else {
    autoInit();
  }
}

export { createSearchApi, mountSearchWidget } from "./search-entry";
export { registerLocale } from "./active-locale-packs";
export type { LocaleTranslationPack } from "./locale-packs/types";
export type * from "./types";
