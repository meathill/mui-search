import type { Hono } from "hono";

import { SEARCH_QUERY_MIN_LENGTH } from "@mui-search/shared";
import { buildJsonResponse, clampLimit, parseLocaleFilter } from "./app-utils";
import type { AppDependencies } from "./types";

interface WpSearchResultItem {
  id: number;
  title: string;
  url: string;
  type: string;
  subtype: string;
}

export function registerWpSearchRoutes(app: Hono, dependencies: AppDependencies): void {
  app.all("/api/wp/v2/search", async function handleWpSearch(c) {
    if (c.req.method !== "GET") {
      return buildJsonResponse(405, { code: "rest_no_route", message: "Method Not Allowed" });
    }

    const search = c.req.query("search")?.trim() ?? "";
    if (!search || search.length < SEARCH_QUERY_MIN_LENGTH) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "access-control-allow-origin": "*",
          "X-WP-Total": "0",
          "X-WP-TotalPages": "0",
        },
      });
    }

    const localeDecision = parseLocaleFilter(c.req.query("locale"));
    if (!localeDecision.ok) {
      return buildJsonResponse(400, { code: "rest_invalid_param", message: localeDecision.message });
    }

    const perPage = clampLimit(c.req.query("per_page"), dependencies.maxSearchPerRequest, 10);

    const results = await dependencies.queryHybridSearch(search, perPage, localeDecision.locale);

    const wpResults: WpSearchResultItem[] = results.map(function toWpItem(item) {
      return {
        id: Number(item.id) || 0,
        title: item.title,
        url: item.url ?? `/${item.slug ?? item.id}`,
        type: "post",
        subtype: c.req.query("subtype") ?? "post",
      };
    });

    return new Response(JSON.stringify(wpResults), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "access-control-allow-origin": "*",
        "X-WP-Total": String(wpResults.length),
        "X-WP-TotalPages": "1",
      },
    });
  });
}
