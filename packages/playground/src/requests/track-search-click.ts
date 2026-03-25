import type { ClickRequestBody, ClickResponseBody } from "@mui-search/shared";
import { fetchWithTimer, type HttpCallResult, isRecord, normalizeApiBaseUrl } from "./client-utils";

export interface ClickRequestOptions {
  apiBaseUrl: string;
  query: string;
  locale: string;
  contentId: string;
  contentTitle: string;
  contentLocale?: string;
}

export async function trackSearchClick(options: ClickRequestOptions): Promise<HttpCallResult<ClickResponseBody>> {
  const requestBody: ClickRequestBody = {
    query: options.query,
    locale: options.locale,
    contentId: options.contentId,
    contentTitle: options.contentTitle,
  };
  if (options.contentLocale) {
    requestBody.contentLocale = options.contentLocale;
  }

  const result = await fetchWithTimer(`${normalizeApiBaseUrl(options.apiBaseUrl)}/api/click`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });
  const payload = ensureClickResponse(result.rawPayload);

  return {
    ...result,
    payload,
  };
}

function ensureClickResponse(payload: unknown): ClickResponseBody {
  if (!isRecord(payload)) {
    throw new Error("Invalid click tracking response format");
  }

  return {
    success: payload.success === true,
  };
}
