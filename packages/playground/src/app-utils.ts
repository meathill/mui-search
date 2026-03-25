export function setStatusMessage(
  message: string,
  isError: boolean,
  setStatusText: (value: string) => void,
  setIsStatusError: (value: boolean) => void,
): void {
  setStatusText(message);
  setIsStatusError(isError);
}

export function buildSuggestionCacheKey(query: string, limit: number, locale: string): string {
  return `${locale}::${query}::${limit}`;
}

export function parseLimitInput(inputValue: string, fallback: number): number {
  return parseRangeInput(inputValue, fallback, 1, 20);
}

export function parseHoursInput(inputValue: string, fallback: number): number {
  return parseRangeInput(inputValue, fallback, 1, 168);
}

function parseRangeInput(inputValue: string, fallback: number, min: number, max: number): number {
  const parsedValue = Number.parseInt(inputValue, 10);
  if (!Number.isFinite(parsedValue)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, parsedValue));
}

export function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error";
}
