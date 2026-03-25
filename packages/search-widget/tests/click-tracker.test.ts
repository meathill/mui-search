import { describe, expect, it, vi } from "vitest";

import { submitClickTrackingByBeacon } from "../src/click-tracker";

const BASE_PAYLOAD = {
  query: "how smart",
  locale: "en",
  contentId: "123",
  contentTitle: "How Smart Are You",
  contentLocale: "en",
};

describe("click-tracker", () => {
  it("sendBeacon 入队成功时不走 fetch fallback", () => {
    const sendBeacon = vi.fn(function sendBeaconMock(_url: string, _data?: BodyInit | null) {
      return true;
    });
    const fetchImpl = vi.fn(async function fetchImplMock(_input: RequestInfo | URL, _init?: RequestInit) {
      return new Response();
    });

    submitClickTrackingByBeacon({
      apiBaseUrl: "https://search.example.com/",
      payload: BASE_PAYLOAD,
      sendBeacon,
      fetchImpl,
    });

    expect(sendBeacon).toHaveBeenCalledTimes(1);
    expect(sendBeacon.mock.calls[0]?.[0]).toBe("https://search.example.com/api/click");
    expect(sendBeacon.mock.calls[0]?.[1]).toBeInstanceOf(Blob);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("sendBeacon 返回 false 时应回退到 fetch keepalive", () => {
    const sendBeacon = vi.fn(function sendBeaconMock(_url: string, _data?: BodyInit | null) {
      return false;
    });
    const fetchImpl = vi.fn(async function fetchImplMock(_input: RequestInfo | URL, _init?: RequestInit) {
      return new Response();
    });

    submitClickTrackingByBeacon({
      apiBaseUrl: "https://search.example.com",
      payload: BASE_PAYLOAD,
      sendBeacon,
      fetchImpl,
    });

    expect(sendBeacon).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const fetchCall = fetchImpl.mock.calls[0];
    const requestInit = fetchCall?.[1];
    expect(fetchCall?.[0]).toBe("https://search.example.com/api/click");
    expect(requestInit).toMatchObject({
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      keepalive: true,
    });
    expect(JSON.parse(String(requestInit?.body))).toEqual(BASE_PAYLOAD);
  });

  it("sendBeacon 抛错时也应回退到 fetch", () => {
    const sendBeacon = vi.fn(function sendBeaconMock(_url: string, _data?: BodyInit | null) {
      throw new Error("beacon blocked");
    });
    const fetchImpl = vi.fn(async function fetchImplMock(_input: RequestInfo | URL, _init?: RequestInit) {
      return new Response();
    });

    submitClickTrackingByBeacon({
      apiBaseUrl: "https://search.example.com",
      payload: BASE_PAYLOAD,
      sendBeacon,
      fetchImpl,
    });

    expect(sendBeacon).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
