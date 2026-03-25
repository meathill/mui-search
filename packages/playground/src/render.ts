import type { HybridSearchResult, SuggestionItem } from "@mui-search/shared";
import type { HttpCallResult } from "./requests";

export function renderSuggestions(
  suggestions: SuggestionItem[],
  suggestionList: HTMLUListElement,
  queryInput: HTMLInputElement,
): void {
  suggestionList.innerHTML = "";

  if (suggestions.length === 0) {
    const listItem = document.createElement("li");
    listItem.className = "empty-item";
    listItem.textContent = "No suggestions";
    suggestionList.appendChild(listItem);
    return;
  }

  for (const item of suggestions) {
    const listItem = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "list-button";
    button.textContent = item.text;
    button.addEventListener("click", function onClick() {
      queryInput.value = item.text;
      queryInput.focus();
    });

    listItem.appendChild(button);
    suggestionList.appendChild(listItem);
  }
}

export function renderResults(results: HybridSearchResult[], resultList: HTMLUListElement): void {
  resultList.innerHTML = "";

  if (results.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "empty-item";
    emptyItem.textContent = "No search results";
    resultList.appendChild(emptyItem);
    return;
  }

  for (const item of results) {
    const listItem = document.createElement("li");
    listItem.className = "result-item";
    listItem.innerHTML = `
      <article>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.content)}</p>
        <p class="score">RRF Score: ${item.score.toFixed(6)}</p>
      </article>
    `;
    resultList.appendChild(listItem);
  }
}

export function renderRawResponse(
  container: HTMLPreElement,
  routeName: string,
  requestPayload: unknown,
  result: HttpCallResult<unknown>,
): void {
  const snapshot = {
    route: routeName,
    status: result.status,
    durationMs: result.durationMs,
    request: requestPayload,
    response: result.rawPayload,
  };
  container.textContent = JSON.stringify(snapshot, null, 2);
}

export function renderRawError(container: HTMLPreElement, routeName: string, error: unknown): void {
  container.textContent = JSON.stringify(
    {
      route: routeName,
      error: formatError(error),
    },
    null,
    2,
  );
}

export function escapeAttribute(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error";
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
