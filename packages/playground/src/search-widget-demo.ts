import { SUPPORTED_LOCALES as WIDGET_LOCALES } from "@mui-search/shared";

const publicUrl = (process.env.PUBLIC_URL as string) || window.location.origin;
const widgetVersion = (process.env.WIDGET_VERSION as string) || "0.0.0";
const DEFAULT_DEMO_LOCALE = "cn";
const LOCALE_QUERY_KEY = "locale";

const copySnippetButton = requireElement(
  "#copy-snippet-button",
  HTMLButtonElement,
  "Missing #copy-snippet-button button",
);
const snippetTextarea = requireElement("#snippet-textarea", HTMLTextAreaElement, "Missing #snippet-textarea textarea");
const copyStatus = requireElement("#copy-status", HTMLParagraphElement, "Missing #copy-status text");
const localeSelect = requireElement(
  "#demo-locale-select",
  HTMLSelectElement,
  "Missing #demo-locale-select locale select",
);
const toolset = requireElement("[data-mui-search]", HTMLElement, "Missing [data-mui-search] container");

const activeLocale = resolveActiveLocale(new URL(window.location.href).searchParams.get(LOCALE_QUERY_KEY));

initDemoPage(activeLocale);

function initDemoPage(locale: string) {
  toolset.dataset.apiBaseUrl = publicUrl;
  toolset.dataset.locale = locale;

  renderLocaleOptions(locale);
  snippetTextarea.value = buildSnippet(locale);

  copySnippetButton.addEventListener("click", function onCopySnippet() {
    void copySnippet(snippetTextarea.value);
  });

  localeSelect.addEventListener("change", function onLocaleChange() {
    const selectedLocale = resolveActiveLocale(localeSelect.value);
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set(LOCALE_QUERY_KEY, selectedLocale);
    window.location.assign(currentUrl.toString());
  });

  loadWidgetScript(locale);
}

function renderLocaleOptions(locale: string) {
  localeSelect.innerHTML = "";
  for (const item of WIDGET_LOCALES) {
    const option = document.createElement("option");
    option.value = item;
    option.textContent = item;
    option.selected = item === locale;
    localeSelect.appendChild(option);
  }
}

function resolveActiveLocale(rawLocale: string | null): string {
  const normalized = rawLocale?.trim().toLowerCase();
  if (!normalized) {
    return DEFAULT_DEMO_LOCALE;
  }
  if (!WIDGET_LOCALES.includes(normalized as (typeof WIDGET_LOCALES)[number])) {
    return DEFAULT_DEMO_LOCALE;
  }

  return normalized;
}

function buildWidgetScriptUrl(locale: string): string {
  return `${publicUrl}/search-widget/search.${widgetVersion}.${locale}.js`;
}

function buildSnippet(locale: string): string {
  return `<!-- 1. Place the widget mount point anywhere on your page -->
<div
  data-mui-search
  data-locale="${locale}"
  data-api-base-url="${publicUrl}"
  data-suggest-limit="8"
  data-search-limit="10"
></div>

<!-- 2. Include the corresponding locale bundle before </body> -->
<script src="${buildWidgetScriptUrl(locale)}"></script>`;
}

async function copySnippet(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    setCopyStatus("Copied. Paste it directly into your site page.", false);
  } catch (error) {
    console.error(error);
    snippetTextarea.focus();
    snippetTextarea.select();
    setCopyStatus("Copy failed: please copy the textarea content manually.", true);
  }
}

function setCopyStatus(text: string, isError: boolean) {
  copyStatus.textContent = text;
  copyStatus.style.color = isError ? "#b42318" : "#2f6b2f";
}

function loadWidgetScript(locale: string) {
  const widgetScript = document.createElement("script");
  widgetScript.src = buildWidgetScriptUrl(locale);
  widgetScript.dataset.locale = locale;
  widgetScript.addEventListener("error", function onScriptError() {
    setCopyStatus(`Failed to load widget script: ${buildWidgetScriptUrl(locale)}`, true);
  });
  document.body.appendChild(widgetScript);
}

function requireElement<T extends Element>(selector: string, elementCtor: { new (): T }, errorMessage: string): T {
  const element = document.querySelector(selector);
  if (!(element instanceof elementCtor)) {
    throw new Error(errorMessage);
  }

  return element;
}
