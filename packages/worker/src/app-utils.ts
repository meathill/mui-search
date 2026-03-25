import type { StatsDimension, StatsGranularity } from "@mui-search/shared";

const LOCALE_PATTERN = /^[a-z]{2}(?:-[a-z]{2})?$/i;
const SUPPORTED_STATS_GRANULARITIES: ReadonlySet<StatsGranularity> = new Set(["day", "week", "month"]);
const SUPPORTED_STATS_DIMENSIONS: ReadonlySet<StatsDimension> = new Set(["query", "content"]);

export function scheduleBackgroundTask(
  c: { executionCtx?: { waitUntil?(promise: Promise<unknown>): void } },
  task: Promise<unknown>,
  errorMessage = "[background] 后台任务失败",
): void {
  const taskWithErrorHandling = task.catch(function handleTaskError(error) {
    console.error(errorMessage, error);
  });

  let executionContext: { waitUntil?(promise: Promise<unknown>): void } | undefined;
  try {
    executionContext = c.executionCtx;
  } catch {
    executionContext = undefined;
  }

  if (executionContext && typeof executionContext.waitUntil === "function") {
    executionContext.waitUntil(taskWithErrorHandling);
    return;
  }

  void taskWithErrorHandling;
}

export function parseLocaleFilter(localeInput?: string):
  | {
      ok: true;
      locale?: string;
    }
  | {
      ok: false;
      message: string;
    } {
  const locale = localeInput?.trim().toLowerCase();
  if (!locale || locale === "all") {
    return { ok: true };
  }

  if (!LOCALE_PATTERN.test(locale)) {
    return { ok: false, message: "参数格式错误，应为 all 或语言代码（如 en/zh/cn）" };
  }

  return {
    ok: true,
    locale,
  };
}

export function parseStatsGranularity(granularityInput?: string):
  | {
      ok: true;
      granularity: StatsGranularity;
    }
  | {
      ok: false;
      message: string;
    } {
  const value = granularityInput?.trim().toLowerCase();
  if (!value) {
    return {
      ok: true,
      granularity: "day",
    };
  }

  if (!SUPPORTED_STATS_GRANULARITIES.has(value as StatsGranularity)) {
    return {
      ok: false,
      message: "granularity 参数错误，应为 day/week/month",
    };
  }

  return {
    ok: true,
    granularity: value as StatsGranularity,
  };
}

export function parseStatsDimension(dimensionInput?: string):
  | {
      ok: true;
      dimension: StatsDimension;
    }
  | {
      ok: false;
      message: string;
    } {
  const value = dimensionInput?.trim().toLowerCase();
  if (!value) {
    return {
      ok: true,
      dimension: "query",
    };
  }

  if (!SUPPORTED_STATS_DIMENSIONS.has(value as StatsDimension)) {
    return {
      ok: false,
      message: "dimension 参数错误，应为 query/content",
    };
  }

  return {
    ok: true,
    dimension: value as StatsDimension,
  };
}

export function resolveDefaultPeriods(granularity: StatsGranularity): number {
  if (granularity === "week") {
    return 12;
  }

  if (granularity === "month") {
    return 6;
  }

  return 14;
}

export function resolveMaxPeriods(granularity: StatsGranularity): number {
  if (granularity === "week") {
    return 52;
  }

  if (granularity === "month") {
    return 24;
  }

  return 180;
}

export function clampLimit(input: string | number | null | undefined, maxLimit: number, defaultLimit: number): number {
  if (typeof input === "number" && Number.isFinite(input)) {
    return Math.min(maxLimit, Math.max(1, Math.floor(input)));
  }

  if (typeof input === "string") {
    const parsedValue = Number.parseInt(input, 10);
    if (Number.isFinite(parsedValue)) {
      return Math.min(maxLimit, Math.max(1, parsedValue));
    }
  }

  return defaultLimit;
}

export function buildJsonResponse(status: number, body: unknown, extraHeaders?: Record<string, string>): Response {
  const headers = new Headers();
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("access-control-allow-origin", "*");

  if (extraHeaders) {
    for (const [key, value] of Object.entries(extraHeaders)) {
      headers.set(key, value);
    }
  }

  return new Response(JSON.stringify(body), {
    status,
    headers,
  });
}
