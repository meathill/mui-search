import type { Hono } from "hono";

import { buildJsonResponse } from "./app-utils";
import { isWpSyncConfigured, runWpSync } from "./services/wp-sync-scheduled";
import type { WorkerEnv } from "./types";

export function registerWpSyncRoutes(app: Hono, env: WorkerEnv): void {
  app.all("/api/wp-sync", async function handleWpSync(c) {
    if (c.req.method !== "POST") {
      return buildJsonResponse(405, { success: false, message: "Method Not Allowed" });
    }

    if (env.API_SECRET_KEY) {
      const apiKey = c.req.header("X-API-Key") ?? "";
      if (apiKey !== env.API_SECRET_KEY) {
        return buildJsonResponse(401, { success: false, message: "Unauthorized" });
      }
    }

    if (!isWpSyncConfigured(env)) {
      return buildJsonResponse(400, {
        success: false,
        message: "WP 同步未配置。请设置 WP_SITE_URL, WP_USERNAME, WP_APP_PASSWORD 环境变量。",
      });
    }

    const url = new URL(c.req.url);
    const mode = url.searchParams.get("mode") === "full" ? ("full" as const) : ("incremental" as const);

    try {
      const summary = await runWpSync(env, mode);
      return buildJsonResponse(200, { success: true, message: summary });
    } catch (error) {
      console.error("[wp-sync] 手动同步失败", error);
      return buildJsonResponse(500, { success: false, message: `同步失败: ${String(error)}` });
    }
  });
}
