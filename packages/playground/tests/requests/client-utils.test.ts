import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchWithTimer, isRecord, normalizeApiBaseUrl, readablePayload } from "../../src/requests/client-utils";

describe("client-utils", () => {
  describe("normalizeApiBaseUrl", () => {
    it("should remove trailing slash", () => {
      expect(normalizeApiBaseUrl("http://localhost:8787/")).toBe("http://localhost:8787");
    });

    it("should keep url without trailing slash", () => {
      expect(normalizeApiBaseUrl("https://api.example.com")).toBe("https://api.example.com");
    });

    it("should trim whitespace", () => {
      expect(normalizeApiBaseUrl("  https://api.example.com/  ")).toBe("https://api.example.com");
    });

    it("should return empty string for empty input", () => {
      expect(normalizeApiBaseUrl("")).toBe("");
      expect(normalizeApiBaseUrl("   ")).toBe("");
    });
  });

  describe("readablePayload", () => {
    it("should return string directly", () => {
      expect(readablePayload("test string")).toBe("test string");
    });

    it("should stringify object", () => {
      expect(readablePayload({ message: "hello" })).toBe('{"message":"hello"}');
    });

    it("should handle BigInt gracefully or return string representation for un-serializable objects", () => {
      // BigInt cannot be serialized by JSON.stringify by default
      const bigIntObj = { value: BigInt(9007199254740991) };
      expect(readablePayload(bigIntObj)).toBe("[Unserializable object]");
    });

    it("should stringify primitives", () => {
      expect(readablePayload(123)).toBe("123");
      expect(readablePayload(true)).toBe("true");
      expect(readablePayload(null)).toBe("null"); // typeof null === 'object', but it's falsy, so it falls to String(payload)
      expect(readablePayload(undefined)).toBe("undefined");
    });
  });

  describe("isRecord", () => {
    it("should return true for plain objects", () => {
      expect(isRecord({ a: 1 })).toBe(true);
      expect(isRecord({})).toBe(true);
    });

    it("should return false for null", () => {
      expect(isRecord(null)).toBe(false);
    });

    it("should return false for primitives and arrays", () => {
      expect(isRecord(123)).toBe(false);
      expect(isRecord("string")).toBe(false);
      expect(isRecord(undefined)).toBe(false);
    });
  });

  describe("fetchWithTimer", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("should fetch and parse JSON successfully", async () => {
      const mockResponse = { data: "success" };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve(mockResponse),
      } as unknown as Response);

      const result = await fetchWithTimer("http://example.com", {});

      expect(result.status).toBe(200);
      expect(result.rawPayload).toEqual(mockResponse);
      expect(result.payload).toEqual(mockResponse);
      expect(result.durationMs).toBeTypeOf("number");
    });

    it("should fetch and parse text if not JSON", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "text/plain" }),
        text: () => Promise.resolve("plain text response"),
      } as unknown as Response);

      const result = await fetchWithTimer("http://example.com", {});

      expect(result.status).toBe(200);
      expect(result.rawPayload).toBe("plain text response");
    });

    it("should throw an error on non-ok response", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({ error: "Internal Server Error" }),
      } as unknown as Response);

      await expect(fetchWithTimer("http://example.com", {})).rejects.toThrowError(
        'HTTP 500: {"error":"Internal Server Error"}',
      );
    });

    it("should throw a timeout error if request takes too long", async () => {
      const abortError = new Error("The operation was aborted");
      abortError.name = "AbortError";

      global.fetch = vi.fn().mockRejectedValue(abortError);

      await expect(fetchWithTimer("http://example.com", {})).rejects.toThrowError(/Request timed out/);
    });
  });
});
