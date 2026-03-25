const URL_PARAM_SUGGEST_QUERY = "suggestQuery";
const URL_PARAM_SEARCH_QUERY = "searchQuery";

export interface QueryState {
  suggestQuery: string;
  searchQuery: string;
}

export function readQueryStateFromUrl(rawUrl: string): QueryState {
  const parsedUrl = new URL(rawUrl);
  return {
    suggestQuery: parsedUrl.searchParams.get(URL_PARAM_SUGGEST_QUERY) ?? "",
    searchQuery: parsedUrl.searchParams.get(URL_PARAM_SEARCH_QUERY) ?? "",
  };
}

export function buildRelativeUrlWithQueryState(rawUrl: string, state: QueryState): string {
  const parsedUrl = new URL(rawUrl);
  setQueryParam(parsedUrl.searchParams, URL_PARAM_SUGGEST_QUERY, state.suggestQuery);
  setQueryParam(parsedUrl.searchParams, URL_PARAM_SEARCH_QUERY, state.searchQuery);

  const search = parsedUrl.searchParams.toString();
  return `${parsedUrl.pathname}${search ? `?${search}` : ""}${parsedUrl.hash}`;
}

function setQueryParam(params: URLSearchParams, key: string, value: string): void {
  const normalizedValue = value.trim();
  if (!normalizedValue) {
    params.delete(key);
    return;
  }

  params.set(key, normalizedValue);
}
