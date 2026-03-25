/**
 * URL、路径、locale 规范化工具。
 * 从 hot-ga4.ts 和 content-target-url.ts 中提取的公共逻辑。
 */

const LOCALE_PATTERN = /^[a-z]{2}(?:-[a-z]{2})?$/i;

export function isLocaleCode(value: string): boolean {
  return LOCALE_PATTERN.test(value);
}

/**
 * 宽松的 locale 规范化：仅 trim + lowercase。
 * 用于 GA4 等外部数据源，输入不一定是标准 locale 格式。
 */
export function normalizeLocaleValue(value: string | undefined): string | undefined {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }
  return normalized;
}

/**
 * 严格的 locale 规范化：trim + lowercase + 格式校验。
 * 用于面向用户的场景，需要确保格式合法。
 */
export function normalizeLocaleStrict(value: string | undefined): string | undefined {
  const normalized = normalizeLocaleValue(value);
  if (!normalized) {
    return undefined;
  }
  if (!isLocaleCode(normalized)) {
    return undefined;
  }
  return normalized;
}

export function normalizeAbsoluteUrl(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed || !/^https?:\/\//i.test(trimmed)) {
    return undefined;
  }

  try {
    return new URL(trimmed).toString();
  } catch {
    return undefined;
  }
}

export function normalizePathLike(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  let pathText = trimmed;
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      pathText = parsed.pathname;
    } catch {
      return undefined;
    }
  }

  const withoutQuery = pathText.split(/[?#]/, 1)[0] ?? "";
  const normalized = withoutQuery.replace(/^\/+|\/+$/g, "");
  if (!normalized) {
    return undefined;
  }

  return normalized;
}
