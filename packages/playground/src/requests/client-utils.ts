import { isRecord, readResponseBody } from "@mui-search/shared";

export { isRecord };

export interface HttpCallResult<TPayload> {
  status: number;
  durationMs: number;
  payload: TPayload;
  rawPayload: unknown;
}

const REQUEST_TIMEOUT_MS = 12_000;

export function normalizeApiBaseUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  if (trimmed.endsWith("/")) {
    return trimmed.slice(0, -1);
  }
  return trimmed;
}

export async function fetchWithTimer(url: string, init: RequestInit): Promise<HttpCallResult<unknown>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(function abortRequest() {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  const startAt = performance.now();

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    });
    const durationMs = Math.round(performance.now() - startAt);
    const rawPayload = await readResponseBody(response);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${readablePayload(rawPayload)}`);
    }

    return {
      status: response.status,
      durationMs,
      payload: rawPayload,
      rawPayload,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timed out (>${REQUEST_TIMEOUT_MS}ms)`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function readablePayload(payload: unknown): string {
  if (typeof payload === "string") {
    return payload;
  }
  if (payload && typeof payload === "object") {
    try {
      return JSON.stringify(payload);
    } catch {
      return "[Unserializable object]";
    }
  }
  return String(payload);
}
