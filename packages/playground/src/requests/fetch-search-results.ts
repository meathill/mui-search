import type { HybridSearchResult, SearchResponseBody } from "@mui-search/shared";
import { fetchWithTimer, type HttpCallResult, isRecord, normalizeApiBaseUrl } from "./client-utils";

export interface SearchRequestOptions {
  apiBaseUrl: string;
  query: string;
  limit: number;
  locale: string;
}

export async function fetchSearchResults(options: SearchRequestOptions): Promise<HttpCallResult<SearchResponseBody>> {
  const url = new URL(`${normalizeApiBaseUrl(options.apiBaseUrl)}/api/search`);
  url.searchParams.set("q", options.query);
  url.searchParams.set("limit", String(options.limit));
  url.searchParams.set("locale", options.locale);

  const result = await fetchWithTimer(url.toString(), {
    method: "GET",
  });
  const payload = ensureSearchResponse(result.rawPayload);

  return {
    ...result,
    payload,
  };
}

function ensureSearchResponse(payload: unknown): SearchResponseBody {
  if (!isRecord(payload)) {
    throw new Error("Invalid search response format");
  }

  const dataField = payload.data;
  if (!Array.isArray(dataField)) {
    throw new Error("Search response is missing the data field");
  }

  const normalizedData: HybridSearchResult[] = dataField.filter(isSearchResultLike).map(function toSearchResult(item) {
    const normalizedResult: HybridSearchResult = {
      id: item.id,
      title: item.title,
      content: item.content,
      score: item.score,
    };

    if (typeof item.locale === "string") {
      normalizedResult.locale = item.locale;
    }

    return normalizedResult;
  });

  return {
    success: payload.success === true,
    data: normalizedData,
  };
}

function isSearchResultLike(value: unknown): value is HybridSearchResult {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.content === "string" &&
    typeof value.score === "number"
  );
}
