export const DEFAULT_LOCALE = "all";
const DEFAULT_SITE_URL_FALLBACK = "";

export const DEFAULT_SITE_URL = resolveDefaultSiteUrl(process.env.SITE_URL as string | undefined);

export const DEFAULT_SUGGEST_LIMIT = 8;
export const DEFAULT_SEARCH_LIMIT = 10;
export const DEFAULT_HOT_LIMIT = 8;
export const DEFAULT_HOT_HOURS = 24;
export const DEFAULT_DEBOUNCE_MS = 1000;
export const DEFAULT_REQUEST_TIMEOUT_MS = 12_000;

export interface LocaleOption {
  value: string;
  label: string;
}

export const DEFAULT_LOCALE_OPTIONS: LocaleOption[] = [
  { value: "all", label: "all" },
  { value: "en", label: "en" },
  { value: "zh", label: "zh" },
  { value: "cn", label: "cn" },
  { value: "ja", label: "ja" },
  { value: "ko", label: "ko" },
];

export function resolveDefaultSiteUrl(rawValue: string | undefined): string {
  const trimmed = rawValue?.trim();
  if (!trimmed) {
    return DEFAULT_SITE_URL_FALLBACK;
  }

  try {
    const parsed = new URL(trimmed);
    const normalizedPathname = parsed.pathname.replace(/\/+$/g, "");
    const pathname = normalizedPathname ? normalizedPathname : "";
    return `${parsed.origin}${pathname}`;
  } catch {
    return DEFAULT_SITE_URL_FALLBACK;
  }
}
