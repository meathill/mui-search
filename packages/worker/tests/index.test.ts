import { describe, expect, it, vi } from "vitest";

import worker from "../src/index";
import type { WorkerEnv } from "../src/types";

const JS_LONG_CACHE_CONTROL = "public, max-age=31536000, immutable";

function buildExecutionContext(waitUntil?: (promise: Promise<unknown>) => void): ExecutionContext {
  return {
    waitUntil: waitUntil ?? vi.fn(),
  } as unknown as ExecutionContext;
}

function buildWorkerEnv(
  assetsFetch: (request: Request) => Promise<Response>,
  database?: D1Database,
  extra: Partial<WorkerEnv> = {},
): WorkerEnv {
  return {
    TIDB_DATABASE_URL: "mysql://root:password@127.0.0.1:4000/search",
    ASSETS: {
      fetch: assetsFetch,
    },
    DB: database,
    ...extra,
  } as unknown as WorkerEnv;
}

describe("worker.fetch", () => {
  it("非 /api 请求委托给 ASSETS", async () => {
    const assetsFetch = vi.fn(async () => {
      return new Response("<html>asset-index</html>", {
        status: 200,
        headers: {
          "content-type": "text/html; charset=utf-8",
        },
      });
    });

    const env = buildWorkerEnv(assetsFetch);
    const request = new Request("https://worker.test/");

    const response = await worker.fetch(request, env, buildExecutionContext());
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain("asset-index");
    expect(assetsFetch).toHaveBeenCalledTimes(1);
    expect(assetsFetch).toHaveBeenCalledWith(request);
  });

  it("JS 资源命中 ASSETS 时应返回一年缓存头", async () => {
    const assetsFetch = vi.fn(async () => {
      return new Response("console.log('asset');", {
        status: 200,
        headers: {
          "content-type": "application/javascript; charset=utf-8",
        },
      });
    });

    const env = buildWorkerEnv(assetsFetch);
    const response = await worker.fetch(
      new Request("https://worker.test/search-widget/search.0.3.2.en.js"),
      env,
      buildExecutionContext(),
    );
    const content = await response.text();

    expect(response.status).toBe(200);
    expect(content).toContain("asset");
    expect(response.headers.get("cache-control")).toBe(JS_LONG_CACHE_CONTROL);
  });

  it("JS 资源在 ASSETS 404 时保持 404", async () => {
    const assetsFetch = vi.fn(async () => new Response("missing", { status: 404 }));
    const env = buildWorkerEnv(assetsFetch);
    const response = await worker.fetch(
      new Request("https://worker.test/search-widget/search.0.3.2.en.js"),
      env,
      buildExecutionContext(),
    );
    const content = await response.text();

    expect(response.status).toBe(404);
    expect(content).toContain("missing");
    expect(assetsFetch).toHaveBeenCalledTimes(1);
  });

  it("/api 请求继续走 Hono API 路由", async () => {
    const assetsFetch = vi.fn(async () => {
      return new Response("should-not-be-called", {
        status: 200,
      });
    });

    const env = buildWorkerEnv(assetsFetch);

    const response = await worker.fetch(new Request("https://worker.test/api/not-found"), env, buildExecutionContext());
    const payload = (await response.json()) as {
      success: boolean;
      message: string;
    };

    expect(response.status).toBe(404);
    expect(payload.success).toBe(false);
    expect(payload.message).toBe("Not Found");
    expect(assetsFetch).not.toHaveBeenCalled();
  });
});

describe("worker.scheduled", () => {
  it("定时任务会刷新热榜快照", async () => {
    const executedSql: string[] = [];

    const database = {
      prepare(sql: string) {
        return {
          bind() {
            return {
              async run() {
                executedSql.push(sql);
                return { success: true };
              },
            };
          },
          async run() {
            executedSql.push(sql);
            return { success: true };
          },
        };
      },
    } as unknown as D1Database;

    let waitPromise: Promise<unknown> | null = null;
    const waitUntil = vi.fn((promise: Promise<unknown>) => {
      waitPromise = promise;
    });

    const env = buildWorkerEnv(
      async (request) => {
        return new Response(request.url);
      },
      database,
      {
        HOT_AGGREGATION_LOOKBACK_HOURS: "24",
        ANALYTICS_RETENTION_HOURS: "168",
      },
    );

    await worker.scheduled(
      {
        cron: "0 * * * *",
        scheduledTime: Date.parse("2026-02-27T10:00:00.000Z"),
      } as unknown as ScheduledEvent,
      env,
      {
        waitUntil,
      } as unknown as ExecutionContext,
    );

    if (waitPromise) {
      await waitPromise;
    }

    expect(waitUntil).toHaveBeenCalledTimes(1);
    expect(executedSql.some((sql) => sql.includes("DELETE FROM hourly_hot_contents WHERE hour_bucket >="))).toBe(true);
    expect(executedSql.some((sql) => sql.includes("FROM click_history"))).toBe(true);
    expect(
      executedSql.some(
        (sql) =>
          sql.includes("DELETE FROM periodic_hot_queries WHERE granularity = ? AND period_bucket >= ?") &&
          sql.includes("period_bucket >= ?"),
      ),
    ).toBe(true);
    expect(
      executedSql.some(
        (sql) =>
          sql.includes("DELETE FROM periodic_hot_contents WHERE granularity = ? AND period_bucket >= ?") &&
          sql.includes("period_bucket >= ?"),
      ),
    ).toBe(true);
    expect(executedSql.some((sql) => sql.includes("FROM periodic_hot_queries day_stats"))).toBe(false);
    expect(executedSql.some((sql) => sql.includes("FROM periodic_hot_contents day_stats"))).toBe(false);
  });

  it("每日定时任务会刷新分段 Top 周期快照", async () => {
    const executedSql: string[] = [];

    const database = {
      prepare(sql: string) {
        return {
          bind() {
            return {
              async run() {
                executedSql.push(sql);
                return { success: true };
              },
            };
          },
          async run() {
            executedSql.push(sql);
            return { success: true };
          },
        };
      },
    } as unknown as D1Database;

    let waitPromise: Promise<unknown> | null = null;
    const waitUntil = vi.fn((promise: Promise<unknown>) => {
      waitPromise = promise;
    });

    const env = buildWorkerEnv(async (request) => {
      return new Response(request.url);
    }, database);

    await worker.scheduled(
      {
        cron: "10 0 * * *",
        scheduledTime: Date.parse("2026-03-05T00:10:00.000Z"),
      } as unknown as ScheduledEvent,
      env,
      {
        waitUntil,
      } as unknown as ExecutionContext,
    );

    if (waitPromise) {
      await waitPromise;
    }

    expect(waitUntil).toHaveBeenCalledTimes(1);
    expect(executedSql.some((sql) => sql.includes("DELETE FROM periodic_hot_queries WHERE granularity = ?"))).toBe(
      true,
    );
    expect(executedSql.some((sql) => sql.includes("FROM periodic_hot_contents day_stats"))).toBe(true);
    expect(executedSql.some((sql) => sql.includes("DELETE FROM hourly_hot_contents WHERE hour_bucket >="))).toBe(false);
  });
});
