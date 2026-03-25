import type { HotContentItem, HotResponseBody } from "@mui-search/shared";
import { fetchWithTimer, type HttpCallResult, isRecord, normalizeApiBaseUrl } from "./client-utils";

export interface HotRequestOptions {
  apiBaseUrl: string;
  locale: string;
  limit: number;
  hours: number;
}

export async function fetchHourlyHotContents(options: HotRequestOptions): Promise<HttpCallResult<HotResponseBody>> {
  const endpoint = new URL(`${normalizeApiBaseUrl(options.apiBaseUrl)}/api/hot`);
  endpoint.searchParams.set("hours", String(options.hours));
  endpoint.searchParams.set("limit", String(options.limit));
  endpoint.searchParams.set("locale", options.locale);

  const result = await fetchWithTimer(endpoint.toString(), {
    method: "GET",
  });
  const payload = ensureHotResponse(result.rawPayload);

  return {
    ...result,
    payload,
  };
}

function ensureHotResponse(payload: unknown): HotResponseBody {
  if (!isRecord(payload)) {
    throw new Error("Invalid hot contents response format");
  }

  const dataField = payload.data;
  if (!Array.isArray(dataField)) {
    throw new Error("Hot contents response is missing the data field");
  }

  const normalizedData: HotContentItem[] = dataField.filter(isHotContentLike).map(function toHotContent(item) {
    return {
      hourBucket: item.hourBucket,
      locale: item.locale,
      contentId: item.contentId,
      contentTitle: item.contentTitle,
      hitCount: item.hitCount,
      ...(typeof item.contentUrl === "string" && item.contentUrl
        ? {
            contentUrl: item.contentUrl,
          }
        : {}),
    };
  });

  return {
    success: payload.success === true,
    data: normalizedData,
  };
}

function isHotContentLike(value: unknown): value is HotContentItem {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.hourBucket === "string" &&
    typeof value.locale === "string" &&
    typeof value.contentId === "string" &&
    typeof value.contentTitle === "string" &&
    typeof value.hitCount === "number" &&
    (value.contentUrl === undefined || typeof value.contentUrl === "string")
  );
}
