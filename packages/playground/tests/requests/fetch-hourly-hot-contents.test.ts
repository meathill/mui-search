import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchWithTimer } from "../../src/requests/client-utils";
import { fetchHourlyHotContents } from "../../src/requests/fetch-hourly-hot-contents";

vi.mock("../../src/requests/client-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/requests/client-utils")>();
  return {
    ...actual,
    fetchWithTimer: vi.fn(),
  };
});

describe("fetchHourlyHotContents", () => {
  beforeEach(() => {
    vi.mocked(fetchWithTimer).mockReset();
  });

  it("should successfully fetch and parse hot contents", async () => {
    const mockPayload = {
      success: true,
      data: [
        { hourBucket: "2023-10-27T10:00:00Z", locale: "zh", contentId: "1", contentTitle: "Trending 1", hitCount: 150 },
        {
          hourBucket: "2023-10-27T10:00:00Z",
          locale: "zh",
          contentId: "2",
          contentTitle: "Trending 2",
          hitCount: 120,
          contentUrl: "https://www.example.com/trending-2/zh/",
          extra: "ignored",
        },
      ],
    };

    vi.mocked(fetchWithTimer).mockResolvedValue({
      status: 200,
      durationMs: 50,
      payload: mockPayload,
      rawPayload: mockPayload,
    });

    const result = await fetchHourlyHotContents({
      apiBaseUrl: "http://example.com",
      hours: 24,
      limit: 10,
      locale: "zh",
    });

    expect(fetchWithTimer).toHaveBeenCalledTimes(1);
    expect(fetchWithTimer).toHaveBeenCalledWith("http://example.com/api/hot?hours=24&limit=10&locale=zh", {
      method: "GET",
    });

    expect(result.payload.success).toBe(true);
    expect(result.payload.data).toHaveLength(2);
    expect(result.payload.data[0]).toEqual({
      hourBucket: "2023-10-27T10:00:00Z",
      locale: "zh",
      contentId: "1",
      contentTitle: "Trending 1",
      hitCount: 150,
    });
    // Extra fields should be stripped out
    expect(result.payload.data[1]).toEqual({
      hourBucket: "2023-10-27T10:00:00Z",
      locale: "zh",
      contentId: "2",
      contentTitle: "Trending 2",
      hitCount: 120,
      contentUrl: "https://www.example.com/trending-2/zh/",
    });
  });

  it("should filter out invalid hot content results", async () => {
    const mockPayload = {
      success: true,
      data: [
        { hourBucket: "2023-10-27T10:00:00Z", locale: "zh", contentId: "1", contentTitle: "Trending 1", hitCount: 150 },
        { contentId: "2" }, // missing fields
        "invalid string",
        null,
      ],
    };

    vi.mocked(fetchWithTimer).mockResolvedValue({
      status: 200,
      durationMs: 50,
      payload: mockPayload,
      rawPayload: mockPayload,
    });

    const result = await fetchHourlyHotContents({
      apiBaseUrl: "http://example.com",
      hours: 24,
      limit: 5,
      locale: "zh",
    });

    expect(result.payload.data).toHaveLength(1);
    expect(result.payload.data[0]).toEqual({
      hourBucket: "2023-10-27T10:00:00Z",
      locale: "zh",
      contentId: "1",
      contentTitle: "Trending 1",
      hitCount: 150,
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
      fetchHourlyHotContents({
        apiBaseUrl: "http://example.com",
        hours: 24,
        limit: 5,
        locale: "zh",
      }),
    ).rejects.toThrowError("Invalid hot contents response format");
  });

  it("should throw an error if data field is missing or not an array", async () => {
    vi.mocked(fetchWithTimer).mockResolvedValue({
      status: 200,
      durationMs: 50,
      payload: { success: true },
      rawPayload: { success: true },
    });

    await expect(
      fetchHourlyHotContents({
        apiBaseUrl: "http://example.com",
        hours: 24,
        limit: 5,
        locale: "zh",
      }),
    ).rejects.toThrowError("Hot contents response is missing the data field");
  });
});
