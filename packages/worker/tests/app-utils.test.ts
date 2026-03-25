import { describe, expect, it } from "vitest";

import {
  buildJsonResponse,
  clampLimit,
  parseLocaleFilter,
  parseStatsDimension,
  parseStatsGranularity,
  resolveDefaultPeriods,
  resolveMaxPeriods,
} from "../src/app-utils";

describe("parseLocaleFilter", () => {
  it("returns ok with no locale when input is undefined", () => {
    const result = parseLocaleFilter(undefined);
    expect(result).toEqual({ ok: true });
  });

  it("returns ok with no locale when input is empty string", () => {
    const result = parseLocaleFilter("");
    expect(result).toEqual({ ok: true });
  });

  it("returns ok with no locale when input is 'all'", () => {
    const result = parseLocaleFilter("all");
    expect(result).toEqual({ ok: true });
  });

  it("returns ok with no locale when input is 'ALL' (case-insensitive)", () => {
    const result = parseLocaleFilter("ALL");
    expect(result).toEqual({ ok: true });
  });

  it("returns ok with lowercase locale for valid two-letter code", () => {
    const result = parseLocaleFilter("EN");
    expect(result).toEqual({ ok: true, locale: "en" });
  });

  it("returns ok with lowercase locale for valid locale with region", () => {
    const result = parseLocaleFilter("zh-CN");
    expect(result).toEqual({ ok: true, locale: "zh-cn" });
  });

  it("trims whitespace from input", () => {
    const result = parseLocaleFilter("  en  ");
    expect(result).toEqual({ ok: true, locale: "en" });
  });

  it("returns error for invalid locale format", () => {
    const result = parseLocaleFilter("invalid-locale-format");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("参数格式错误");
    }
  });

  it("returns error for numeric input", () => {
    const result = parseLocaleFilter("123");
    expect(result.ok).toBe(false);
  });
});

describe("parseStatsGranularity", () => {
  it("defaults to 'day' when input is undefined", () => {
    const result = parseStatsGranularity(undefined);
    expect(result).toEqual({ ok: true, granularity: "day" });
  });

  it("defaults to 'day' when input is empty string", () => {
    const result = parseStatsGranularity("");
    expect(result).toEqual({ ok: true, granularity: "day" });
  });

  it("parses 'day' correctly", () => {
    const result = parseStatsGranularity("day");
    expect(result).toEqual({ ok: true, granularity: "day" });
  });

  it("parses 'week' correctly", () => {
    const result = parseStatsGranularity("week");
    expect(result).toEqual({ ok: true, granularity: "week" });
  });

  it("parses 'month' correctly", () => {
    const result = parseStatsGranularity("month");
    expect(result).toEqual({ ok: true, granularity: "month" });
  });

  it("is case-insensitive", () => {
    const result = parseStatsGranularity("DAY");
    expect(result).toEqual({ ok: true, granularity: "day" });
  });

  it("trims whitespace", () => {
    const result = parseStatsGranularity("  week  ");
    expect(result).toEqual({ ok: true, granularity: "week" });
  });

  it("returns error for unsupported granularity", () => {
    const result = parseStatsGranularity("year");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("granularity");
    }
  });
});

describe("parseStatsDimension", () => {
  it("defaults to 'query' when input is undefined", () => {
    const result = parseStatsDimension(undefined);
    expect(result).toEqual({ ok: true, dimension: "query" });
  });

  it("defaults to 'query' when input is empty string", () => {
    const result = parseStatsDimension("");
    expect(result).toEqual({ ok: true, dimension: "query" });
  });

  it("parses 'query' correctly", () => {
    const result = parseStatsDimension("query");
    expect(result).toEqual({ ok: true, dimension: "query" });
  });

  it("parses 'content' correctly", () => {
    const result = parseStatsDimension("content");
    expect(result).toEqual({ ok: true, dimension: "content" });
  });

  it("is case-insensitive", () => {
    const result = parseStatsDimension("CONTENT");
    expect(result).toEqual({ ok: true, dimension: "content" });
  });

  it("trims whitespace", () => {
    const result = parseStatsDimension("  query  ");
    expect(result).toEqual({ ok: true, dimension: "query" });
  });

  it("returns error for unsupported dimension", () => {
    const result = parseStatsDimension("page");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("dimension");
    }
  });
});

describe("resolveDefaultPeriods", () => {
  it("returns 14 for 'day'", () => {
    expect(resolveDefaultPeriods("day")).toBe(14);
  });

  it("returns 12 for 'week'", () => {
    expect(resolveDefaultPeriods("week")).toBe(12);
  });

  it("returns 6 for 'month'", () => {
    expect(resolveDefaultPeriods("month")).toBe(6);
  });
});

describe("resolveMaxPeriods", () => {
  it("returns 180 for 'day'", () => {
    expect(resolveMaxPeriods("day")).toBe(180);
  });

  it("returns 52 for 'week'", () => {
    expect(resolveMaxPeriods("week")).toBe(52);
  });

  it("returns 24 for 'month'", () => {
    expect(resolveMaxPeriods("month")).toBe(24);
  });
});

describe("clampLimit", () => {
  it("returns defaultLimit when input is undefined", () => {
    expect(clampLimit(undefined, 100, 10)).toBe(10);
  });

  it("returns defaultLimit when input is null", () => {
    expect(clampLimit(null, 100, 10)).toBe(10);
  });

  it("clamps numeric input to maxLimit", () => {
    expect(clampLimit(200, 100, 10)).toBe(100);
  });

  it("clamps numeric input to minimum of 1", () => {
    expect(clampLimit(0, 100, 10)).toBe(1);
    expect(clampLimit(-5, 100, 10)).toBe(1);
  });

  it("floors fractional numeric input", () => {
    expect(clampLimit(5.9, 100, 10)).toBe(5);
  });

  it("returns value within range as-is (floored)", () => {
    expect(clampLimit(50, 100, 10)).toBe(50);
  });

  it("parses valid string input", () => {
    expect(clampLimit("25", 100, 10)).toBe(25);
  });

  it("clamps parsed string to maxLimit", () => {
    expect(clampLimit("999", 100, 10)).toBe(100);
  });

  it("clamps parsed string to minimum of 1", () => {
    expect(clampLimit("0", 100, 10)).toBe(1);
    expect(clampLimit("-3", 100, 10)).toBe(1);
  });

  it("returns defaultLimit for non-numeric string", () => {
    expect(clampLimit("abc", 100, 10)).toBe(10);
  });

  it("returns defaultLimit for NaN number", () => {
    expect(clampLimit(NaN, 100, 10)).toBe(10);
  });

  it("returns defaultLimit for Infinity", () => {
    expect(clampLimit(Infinity, 100, 10)).toBe(10);
  });
});

describe("buildJsonResponse", () => {
  it("returns a Response with the given status", () => {
    const response = buildJsonResponse(200, { success: true });
    expect(response.status).toBe(200);
  });

  it("sets content-type to application/json", async () => {
    const response = buildJsonResponse(200, { ok: true });
    expect(response.headers.get("content-type")).toBe("application/json; charset=utf-8");
  });

  it("sets CORS header to allow all origins", () => {
    const response = buildJsonResponse(200, {});
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
  });

  it("serializes body as JSON", async () => {
    const body = { success: true, data: [1, 2, 3] };
    const response = buildJsonResponse(200, body);
    const parsed = await response.json();
    expect(parsed).toEqual(body);
  });

  it("applies extra headers when provided", () => {
    const response = buildJsonResponse(200, {}, { "cache-control": "no-store", "x-custom": "value" });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-custom")).toBe("value");
  });

  it("works without extraHeaders", () => {
    const response = buildJsonResponse(404, { error: "not found" });
    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toContain("application/json");
  });
});
