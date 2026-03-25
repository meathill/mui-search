import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchWithTimer } from "../../src/requests/client-utils";
import { trackSearchClick } from "../../src/requests/track-search-click";

vi.mock("../../src/requests/client-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/requests/client-utils")>();
  return {
    ...actual,
    fetchWithTimer: vi.fn(),
  };
});

describe("trackSearchClick", () => {
  beforeEach(() => {
    vi.mocked(fetchWithTimer).mockReset();
  });

  it("should successfully fetch and parse click response", async () => {
    const mockPayload = { success: true };

    vi.mocked(fetchWithTimer).mockResolvedValue({
      status: 200,
      durationMs: 50,
      payload: mockPayload,
      rawPayload: mockPayload,
    });

    const result = await trackSearchClick({
      apiBaseUrl: "http://example.com",
      query: "test query",
      locale: "zh",
      contentId: "123",
      contentTitle: "Test Title",
      contentLocale: "en",
    });

    expect(fetchWithTimer).toHaveBeenCalledTimes(1);
    expect(fetchWithTimer).toHaveBeenCalledWith("http://example.com/api/click", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        query: "test query",
        locale: "zh",
        contentId: "123",
        contentTitle: "Test Title",
        contentLocale: "en",
      }),
    });

    expect(result.payload.success).toBe(true);
  });

  it("should omit contentLocale in request body when not provided", async () => {
    vi.mocked(fetchWithTimer).mockResolvedValue({
      status: 200,
      durationMs: 50,
      payload: { success: true },
      rawPayload: { success: true },
    });

    await trackSearchClick({
      apiBaseUrl: "http://example.com",
      query: "test query",
      locale: "zh",
      contentId: "123",
      contentTitle: "Test Title",
    });

    expect(fetchWithTimer).toHaveBeenCalledWith("http://example.com/api/click", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        query: "test query",
        locale: "zh",
        contentId: "123",
        contentTitle: "Test Title",
      }),
    });
  });

  it("should throw an error if payload is not an object", async () => {
    vi.mocked(fetchWithTimer).mockResolvedValue({
      status: 200,
      durationMs: 50,
      payload: "string response",
      rawPayload: "string response",
    });

    await expect(
      trackSearchClick({
        apiBaseUrl: "http://example.com",
        query: "test query",
        locale: "zh",
        contentId: "123",
        contentTitle: "Test Title",
      }),
    ).rejects.toThrowError("Invalid click tracking response format");
  });
});
