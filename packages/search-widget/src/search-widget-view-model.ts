export type ContentPanelMode = "hot" | "suggestion" | "search";

interface SuggestionRenderContext {
  suggestionCount: number;
  isSuggestLoading: boolean;
}

export function resolveContentPanelMode(query: string, lastSearchQuery: string): ContentPanelMode {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return "hot";
  }
  if (normalizedQuery === lastSearchQuery.trim()) {
    return "search";
  }
  return "suggestion";
}

export function calculateSuggestionRenderedCount(context: SuggestionRenderContext): number {
  if (context.suggestionCount > 0) {
    return context.suggestionCount;
  }
  return context.isSuggestLoading ? 0 : 1;
}
