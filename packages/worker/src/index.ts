import { createWorkerApp } from "./app";
import { createRuntimeDependencies } from "./runtime";
import { createSearchAnalyticsService } from "./services/search-analytics";
import { runWpSync } from "./services/wp-sync-scheduled";
import type { WorkerEnv } from "./types";

const DEFAULT_ANALYTICS_LOOKBACK_HOURS = 48;
const DEFAULT_ANALYTICS_RETENTION_HOURS = 24 * 30;
const HOURLY_SEGMENTED_DAY_LOOKBACK_DAYS = 1;
const HOURLY_HOT_CRON = "0 * * * *";
const DAILY_SEGMENTED_TOP_CRON = "10 0 * * *";
const DAILY_WP_SYNC_CRON = "30 2 * * *";
const JS_LONG_CACHE_CONTROL = "public, max-age=31536000, immutable";

const worker = {
  async fetch(request: Request, env: WorkerEnv, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;
    if (!isApiPath(pathname)) {
      const assetResponse = await env.ASSETS.fetch(request);

      if (!isJavaScriptPath(pathname)) {
        return assetResponse;
      }

      return assetResponse.status === 404 ? assetResponse : withLongCacheForJavaScript(assetResponse);
    }

    const dependencies = createRuntimeDependencies(env);
    const app = createWorkerApp(dependencies, env);
    return app.fetch(request, env, ctx);
  },

  async scheduled(event: ScheduledEvent, env: WorkerEnv, ctx: ExecutionContext): Promise<void> {
    const analyticsService = createSearchAnalyticsService(env.DB);
    const now = new Date(event.scheduledTime);

    let task: Promise<void>;
    if (event.cron === DAILY_WP_SYNC_CRON) {
      console.log("[wp-sync] cron 触发");
      task = runWpSync(env).then(function onWpSyncDone(summary) {
        console.log("[wp-sync] cron 完成:", summary);
      });
    } else if (event.cron === DAILY_SEGMENTED_TOP_CRON) {
      task = analyticsService.refreshSegmentedTopSnapshot({
        now,
      });
    } else {
      if (event.cron && event.cron !== HOURLY_HOT_CRON) {
        console.warn(`[analytics] 未识别的 cron 表达式，回退执行小时聚合: ${event.cron}`);
      }
      const lookbackHours = parsePositiveInteger(env.HOT_AGGREGATION_LOOKBACK_HOURS, DEFAULT_ANALYTICS_LOOKBACK_HOURS);
      const retentionHours = parsePositiveInteger(env.ANALYTICS_RETENTION_HOURS, DEFAULT_ANALYTICS_RETENTION_HOURS);

      task = Promise.all([
        analyticsService.refreshHourlyHotContentsSnapshot({
          now,
          lookbackHours,
          retentionHours,
        }),
        analyticsService.refreshSegmentedTopDaySnapshot({
          now,
          dayRefreshLookbackDays: HOURLY_SEGMENTED_DAY_LOOKBACK_DAYS,
        }),
      ]).then(function onHourlyAggregated() {
        return;
      });
    }

    ctx.waitUntil(
      task.catch(function onScheduledError(error) {
        console.error("[scheduled] 定时任务失败", error);
      }),
    );
  },
};

function isApiPath(pathname: string): boolean {
  return pathname === "/api" || pathname.startsWith("/api/");
}

function isJavaScriptPath(pathname: string): boolean {
  return pathname.toLowerCase().endsWith(".js");
}

function withLongCacheForJavaScript(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("cache-control", JS_LONG_CACHE_CONTROL);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function parsePositiveInteger(raw: string | undefined, fallback: number): number {
  if (!raw) {
    return fallback;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

export default worker;
