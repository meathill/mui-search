import { isLocaleCode, normalizeAbsoluteUrl, normalizeLocaleStrict, normalizePathLike } from "@mui-search/shared";

export interface BuildContentTargetUrlOptions {
  siteUrl: string;
  slugOrPath?: string | undefined;
  locale?: string | undefined;
  explicitUrl?: string | undefined;
}

export function buildContentTargetUrl(options: BuildContentTargetUrlOptions): string | undefined {
  const explicitUrl = normalizeAbsoluteUrl(options.explicitUrl);
  if (explicitUrl) {
    return explicitUrl;
  }

  const normalizedSiteUrl = normalizeSiteUrl(options.siteUrl);
  const normalizedPath = normalizePathLike(options.slugOrPath);
  if (!normalizedPath) {
    return undefined;
  }

  const segments = normalizedPath.split("/").filter(Boolean);
  if (segments.length === 0) {
    return undefined;
  }

  const normalizedLocale = normalizeLocaleStrict(options.locale);
  const lastSegment = segments.at(-1);
  if (!lastSegment || !isLocaleCode(lastSegment)) {
    if (normalizedLocale) {
      segments.push(normalizedLocale);
    }
  }

  const encodedPath = segments.map(encodeURIComponent).join("/");
  const targetUrl = `${normalizedSiteUrl}/${encodedPath}/`;
  return targetUrl;
}

export function normalizeSiteUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("siteUrl 不能为空");
  }

  const parsed = new URL(trimmed);
  const normalizedPathname = parsed.pathname.replace(/\/+$/g, "");
  const pathname = normalizedPathname ? normalizedPathname : "";
  return `${parsed.origin}${pathname}`;
}
