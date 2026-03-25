import { describe, expect, it } from "vitest";
import {
  isLocaleCode,
  normalizeAbsoluteUrl,
  normalizeLocaleStrict,
  normalizeLocaleValue,
  normalizePathLike,
} from "../src/url-utils";

describe("isLocaleCode", () => {
  it("accepts 2-letter codes", () => {
    expect(isLocaleCode("en")).toBe(true);
    expect(isLocaleCode("zh")).toBe(true);
  });

  it("accepts 2-letter-2-letter codes", () => {
    expect(isLocaleCode("pt-br")).toBe(true);
    expect(isLocaleCode("zh-tw")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isLocaleCode("EN")).toBe(true);
    expect(isLocaleCode("Pt-Br")).toBe(true);
  });

  it("rejects invalid formats", () => {
    expect(isLocaleCode("")).toBe(false);
    expect(isLocaleCode("e")).toBe(false);
    expect(isLocaleCode("eng")).toBe(false);
    expect(isLocaleCode("en-")).toBe(false);
    expect(isLocaleCode("en-x")).toBe(false);
    expect(isLocaleCode("123")).toBe(false);
  });
});

describe("normalizeLocaleValue", () => {
  it("trims and lowercases", () => {
    expect(normalizeLocaleValue("  EN  ")).toBe("en");
    expect(normalizeLocaleValue("Zh")).toBe("zh");
  });

  it("returns undefined for empty/undefined", () => {
    expect(normalizeLocaleValue(undefined)).toBeUndefined();
    expect(normalizeLocaleValue("")).toBeUndefined();
    expect(normalizeLocaleValue("   ")).toBeUndefined();
  });
});

describe("normalizeLocaleStrict", () => {
  it("returns valid locale codes", () => {
    expect(normalizeLocaleStrict("en")).toBe("en");
    expect(normalizeLocaleStrict("pt-br")).toBe("pt-br");
  });

  it("rejects non-locale values", () => {
    expect(normalizeLocaleStrict("english")).toBeUndefined();
    expect(normalizeLocaleStrict("123")).toBeUndefined();
  });

  it("returns undefined for empty", () => {
    expect(normalizeLocaleStrict(undefined)).toBeUndefined();
  });
});

describe("normalizeAbsoluteUrl", () => {
  it("normalizes valid URLs", () => {
    expect(normalizeAbsoluteUrl("https://example.com")).toBe("https://example.com/");
    expect(normalizeAbsoluteUrl("http://example.com/path")).toBe("http://example.com/path");
  });

  it("trims whitespace", () => {
    expect(normalizeAbsoluteUrl("  https://example.com  ")).toBe("https://example.com/");
  });

  it("returns undefined for non-absolute URLs", () => {
    expect(normalizeAbsoluteUrl("/relative/path")).toBeUndefined();
    expect(normalizeAbsoluteUrl("just-text")).toBeUndefined();
  });

  it("returns undefined for empty/undefined", () => {
    expect(normalizeAbsoluteUrl(undefined)).toBeUndefined();
    expect(normalizeAbsoluteUrl("")).toBeUndefined();
  });

  it("returns undefined for invalid URLs", () => {
    expect(normalizeAbsoluteUrl("https://")).toBeUndefined();
  });
});

describe("normalizePathLike", () => {
  it("normalizes simple paths", () => {
    expect(normalizePathLike("some/path")).toBe("some/path");
    expect(normalizePathLike("/some/path/")).toBe("some/path");
  });

  it("extracts path from full URLs", () => {
    expect(normalizePathLike("https://example.com/some/path")).toBe("some/path");
    expect(normalizePathLike("https://example.com/quiz/en?foo=1")).toBe("quiz/en");
  });

  it("strips query and hash", () => {
    expect(normalizePathLike("path?query=1")).toBe("path");
    expect(normalizePathLike("path#hash")).toBe("path");
  });

  it("returns undefined for empty/undefined", () => {
    expect(normalizePathLike(undefined)).toBeUndefined();
    expect(normalizePathLike("")).toBeUndefined();
    expect(normalizePathLike("   ")).toBeUndefined();
  });

  it("returns undefined for root-only URLs", () => {
    expect(normalizePathLike("https://example.com/")).toBeUndefined();
    expect(normalizePathLike("/")).toBeUndefined();
  });
});
