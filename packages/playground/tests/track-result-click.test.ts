import type { SetStateAction } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { trackSearchClick } from "../src/requests";
import { submitResultClickTracking } from "../src/track-result-click";
import type { HybridSearchResult } from "@mui-search/shared";

vi.mock("../src/requests", () => {
  return {
    trackSearchClick: vi.fn(),
  };
});

function createSetterSpy<T>() {
  const calls: T[] = [];
  const setter = vi.fn((value: SetStateAction<T>) => {
    if (typeof value === "function") {
      throw new Error("测试 setter 不支持函数式更新");
    }

    calls.push(value);
  });

  return {
    setter,
    getCalls() {
      return calls;
    },
    getLastValue() {
      return calls.at(-1);
    },
  };
}

function createResultItem(): HybridSearchResult {
  return {
    id: "101",
    title: "How Smart Are You",
    content: "test content",
    score: 0.56,
    locale: "en",
  };
}

describe("submitResultClickTracking", () => {
  const mockedTrackSearchClick = vi.mocked(trackSearchClick);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("缺少有效 query 时应直接报错并中断请求", async () => {
    const statusSetter = createSetterSpy<string>();
    const statusErrorSetter = createSetterSpy<boolean>();
    const trackingSetter = createSetterSpy<string>();
    const requestHotContents = vi.fn(async () => {});

    await submitResultClickTracking({
      item: createResultItem(),
      apiBaseUrl: "https://example.com",
      lastSearchQuery: "",
      query: "   ",
      lastSearchLocale: "en",
      localeFilter: "en",
      setIsTrackingResultId: trackingSetter.setter,
      setStatusText: statusSetter.setter,
      setIsStatusError: statusErrorSetter.setter,
      requestHotContents,
    });

    expect(statusSetter.getLastValue()).toBe("Run a search before tracking clicks.");
    expect(statusErrorSetter.getLastValue()).toBe(true);
    expect(trackingSetter.getCalls()).toHaveLength(0);
    expect(requestHotContents).not.toHaveBeenCalled();
    expect(mockedTrackSearchClick).not.toHaveBeenCalled();
  });

  it("上报成功后应刷新热榜并重置 tracking 状态", async () => {
    mockedTrackSearchClick.mockResolvedValueOnce({
      status: 200,
      durationMs: 35,
      payload: { success: true },
      rawPayload: { success: true },
    });

    const statusSetter = createSetterSpy<string>();
    const statusErrorSetter = createSetterSpy<boolean>();
    const trackingSetter = createSetterSpy<string>();
    const requestHotContents = vi.fn(async () => {});

    await submitResultClickTracking({
      item: createResultItem(),
      apiBaseUrl: "https://example.com",
      lastSearchQuery: "what animal",
      query: "unused",
      lastSearchLocale: "en",
      localeFilter: "zh",
      setIsTrackingResultId: trackingSetter.setter,
      setStatusText: statusSetter.setter,
      setIsStatusError: statusErrorSetter.setter,
      requestHotContents,
    });

    expect(mockedTrackSearchClick).toHaveBeenCalledWith({
      apiBaseUrl: "https://example.com",
      query: "what animal",
      locale: "en",
      contentId: "101",
      contentTitle: "How Smart Are You",
      contentLocale: "en",
    });
    expect(statusErrorSetter.getLastValue()).toBe(false);
    expect(statusSetter.getLastValue()).toContain("Click tracked");
    expect(requestHotContents).toHaveBeenCalledTimes(1);
    expect(trackingSetter.getCalls()).toEqual(["101", ""]);
  });

  it("上报失败时应返回错误状态并重置 tracking 状态", async () => {
    mockedTrackSearchClick.mockRejectedValueOnce(new Error("Forbidden"));

    const statusSetter = createSetterSpy<string>();
    const statusErrorSetter = createSetterSpy<boolean>();
    const trackingSetter = createSetterSpy<string>();
    const requestHotContents = vi.fn(async () => {});

    await submitResultClickTracking({
      item: createResultItem(),
      apiBaseUrl: "https://example.com",
      lastSearchQuery: "how",
      query: "how",
      lastSearchLocale: "",
      localeFilter: "all",
      setIsTrackingResultId: trackingSetter.setter,
      setStatusText: statusSetter.setter,
      setIsStatusError: statusErrorSetter.setter,
      requestHotContents,
    });

    expect(statusSetter.getLastValue()).toBe("Click tracking failed: Forbidden");
    expect(statusErrorSetter.getLastValue()).toBe(true);
    expect(requestHotContents).not.toHaveBeenCalled();
    expect(trackingSetter.getCalls()).toEqual(["101", ""]);
  });
});
