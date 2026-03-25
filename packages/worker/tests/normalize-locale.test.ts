import { describe, expect, it } from "vitest";

import { normalizeLocale } from "../src/services/search-analytics-common";
import { createSearchAnalyticsService } from "../src/services/search-analytics";
import { createLoggedDatabase } from "./search-analytics-test-helpers";

describe("normalizeLocale", () => {
  it("合法的两字母语言代码应原样返回", () => {
    expect(normalizeLocale("en")).toBe("en");
    expect(normalizeLocale("zh")).toBe("zh");
    expect(normalizeLocale("ja")).toBe("ja");
    expect(normalizeLocale("da")).toBe("da");
  });

  it("合法的语言-地区代码应原样返回", () => {
    expect(normalizeLocale("zh-cn")).toBe("zh-cn");
    expect(normalizeLocale("en-us")).toBe("en-us");
  });

  it("应转为小写", () => {
    expect(normalizeLocale("EN")).toBe("en");
    expect(normalizeLocale("Zh-CN")).toBe("zh-cn");
  });

  it("应去除首尾空格", () => {
    expect(normalizeLocale("  en  ")).toBe("en");
  });

  it("空值或 all 应返回 all", () => {
    expect(normalizeLocale(undefined)).toBe("all");
    expect(normalizeLocale("")).toBe("all");
    expect(normalizeLocale("all")).toBe("all");
  });

  it("格式不合法的值应返回 all", () => {
    expect(normalizeLocale("abc")).toBe("all");
    expect(normalizeLocale("1")).toBe("all");
    expect(normalizeLocale("en-")).toBe("all");
    expect(normalizeLocale("-cn")).toBe("all");
    expect(normalizeLocale("en-us-extra")).toBe("all");
    expect(normalizeLocale("123")).toBe("all");
  });

  it("格式合法但不在支持列表中的 locale 应返回 all（issue #8）", () => {
    expect(normalizeLocale("dn")).toBe("all");
    expect(normalizeLocale("xx")).toBe("all");
    expect(normalizeLocale("zz")).toBe("all");
    expect(normalizeLocale("xx-yy")).toBe("all");
  });
});

describe("recordSearch 应将无效 locale 归为 all（issue #8）", () => {
  it("无效 locale 写入 search_history 时应存为 all", async () => {
    const { database, callLogs } = createLoggedDatabase();
    const service = createSearchAnalyticsService(database);

    await service.recordSearch({
      query: "test",
      locale: "dn",
      resultCount: 1,
    });

    const insertCall = callLogs.find((entry) => entry.sql.includes("INSERT INTO search_history"));
    expect(insertCall).toBeDefined();
    expect(insertCall?.params[1]).toBe("all");
  });
});

describe("recordClick 应将无效 locale 归为 all（issue #8）", () => {
  it("无效 locale 写入 click_history 时应存为 all", async () => {
    const { database, callLogs } = createLoggedDatabase();
    const service = createSearchAnalyticsService(database);

    await service.recordClick({
      query: "test",
      locale: "dn",
      contentId: "101",
      contentTitle: "Test",
      contentLocale: "dn",
    });

    const insertCall = callLogs.find((entry) => entry.sql.includes("INSERT INTO click_history"));
    expect(insertCall).toBeDefined();
    expect(insertCall?.params[1]).toBe("all");
    expect(insertCall?.params[4]).toBe("all");
  });
});
