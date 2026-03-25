import { Hono } from "hono";
import { cors } from "hono/cors";

import { type ClickRequestBody, type ClickResponseBody } from "@mui-search/shared";
import { buildJsonResponse, parseLocaleFilter, scheduleBackgroundTask } from "./app-utils";
import { registerReadRoutes } from "./read-routes";
import { registerSearchRoutes } from "./search-routes";
import type { AppDependencies, ClickEventRecord } from "./types";

export function createWorkerApp(dependencies: AppDependencies): Hono {
  const app = new Hono();

  app.use(
    "*",
    cors({
      origin: "*",
      allowMethods: ["GET", "POST", "OPTIONS"],
      allowHeaders: ["content-type"],
    }),
  );

  registerSearchRoutes(app, dependencies);
  registerReadRoutes(app, dependencies);

  app.all("/api/click", async function handleClick(c) {
    if (c.req.method !== "POST") {
      return buildJsonResponse(405, { success: false, message: "Method Not Allowed" });
    }

    let payload: ClickRequestBody;
    try {
      payload = await c.req.json<ClickRequestBody>();
    } catch {
      return buildJsonResponse(400, { success: false, message: "请求体必须是合法 JSON" });
    }

    const query = payload.query?.trim() ?? "";
    const contentId = payload.contentId?.trim() ?? "";
    const contentTitle = payload.contentTitle?.trim() ?? "";
    if (!query) {
      return buildJsonResponse(400, { success: false, message: "query 不能为空" });
    }

    if (!contentId) {
      return buildJsonResponse(400, { success: false, message: "contentId 不能为空" });
    }

    if (!contentTitle) {
      return buildJsonResponse(400, { success: false, message: "contentTitle 不能为空" });
    }

    const localeDecision = parseLocaleFilter(payload.locale);
    if (!localeDecision.ok) {
      return buildJsonResponse(400, { success: false, message: localeDecision.message });
    }

    const contentLocaleDecision = parseLocaleFilter(payload.contentLocale);
    if (!contentLocaleDecision.ok) {
      return buildJsonResponse(400, { success: false, message: `contentLocale ${contentLocaleDecision.message}` });
    }

    const clickEvent: ClickEventRecord = {
      query,
      locale: localeDecision.locale ?? "all",
      contentId,
      contentTitle,
      contentLocale: contentLocaleDecision.locale ?? localeDecision.locale ?? "all",
    };

    scheduleBackgroundTask(c, dependencies.recordClickEvent(clickEvent), "[analytics] 写入点击记录失败");

    const responseBody: ClickResponseBody = {
      success: true,
    };

    return buildJsonResponse(200, responseBody);
  });

  app.all("/api/health", function handleHealth() {
    return buildJsonResponse(200, {
      success: true,
      version: "0.1.0",
      timestamp: new Date().toISOString(),
    });
  });

  app.all("/api/*", function handleApiNotFound() {
    return buildJsonResponse(404, { success: false, message: "Not Found" });
  });

  app.all("*", function handleNotFound() {
    return buildJsonResponse(404, { success: false, message: "Not Found" });
  });

  return app;
}
