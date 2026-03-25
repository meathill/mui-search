import { describe, expect, it } from "vitest";
import { isRecord, readResponseBody } from "../src/validators";

describe("isRecord", () => {
  it("returns true for plain objects", () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord({ a: 1 })).toBe(true);
  });

  it("returns true for arrays (they are objects)", () => {
    expect(isRecord([])).toBe(true);
  });

  it("returns false for null", () => {
    expect(isRecord(null)).toBe(false);
  });

  it("returns false for primitives", () => {
    expect(isRecord(undefined)).toBe(false);
    expect(isRecord(42)).toBe(false);
    expect(isRecord("string")).toBe(false);
    expect(isRecord(true)).toBe(false);
  });
});

describe("readResponseBody", () => {
  it("parses JSON response", async () => {
    const response = new Response(JSON.stringify({ success: true }), {
      headers: { "content-type": "application/json" },
    });
    const body = await readResponseBody(response);
    expect(body).toEqual({ success: true });
  });

  it("returns text for non-JSON response", async () => {
    const response = new Response("hello", {
      headers: { "content-type": "text/plain" },
    });
    const body = await readResponseBody(response);
    expect(body).toBe("hello");
  });

  it("handles invalid JSON gracefully", async () => {
    const response = new Response("not json", {
      headers: { "content-type": "application/json" },
    });
    const body = await readResponseBody(response);
    expect(body).toEqual({ message: "Response body is not valid JSON" });
  });

  it("handles missing content-type", async () => {
    const response = new Response("fallback text");
    const body = await readResponseBody(response);
    expect(body).toBe("fallback text");
  });
});
