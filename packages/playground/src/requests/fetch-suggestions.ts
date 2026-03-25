import type { SuggestionItem, SuggestResponseBody } from "@mui-search/shared";
import { fetchWithTimer, type HttpCallResult, isRecord, normalizeApiBaseUrl } from "./client-utils";

export interface SuggestRequestOptions {
  apiBaseUrl: string;
  query: string;
  limit: number;
  locale: string;
}

export async function fetchSuggestions(options: SuggestRequestOptions): Promise<HttpCallResult<SuggestResponseBody>> {
  const endpoint = new URL(`${normalizeApiBaseUrl(options.apiBaseUrl)}/api/suggest`);
  endpoint.searchParams.set("q", options.query);
  endpoint.searchParams.set("limit", String(options.limit));
  endpoint.searchParams.set("locale", options.locale);

  const result = await fetchWithTimer(endpoint.toString(), {
    method: "GET",
  });
  const payload = ensureSuggestResponse(result.rawPayload);
  return {
    ...result,
    payload,
  };
}

function ensureSuggestResponse(payload: unknown): SuggestResponseBody {
  if (!isRecord(payload)) {
    throw new Error("Invalid suggestions response format");
  }

  const suggestions = payload.suggestions;
  if (!Array.isArray(suggestions)) {
    throw new Error("Suggestions response is missing the suggestions field");
  }

  const normalizedSuggestions: SuggestionItem[] = suggestions.filter(isSuggestionLike).map(function toSuggestion(item) {
    return {
      id: item.id,
      text: item.text,
    };
  });

  return {
    success: payload.success === true,
    suggestions: normalizedSuggestions,
  };
}

function isSuggestionLike(value: unknown): value is SuggestionItem {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value.id === "string" && typeof value.text === "string";
}
