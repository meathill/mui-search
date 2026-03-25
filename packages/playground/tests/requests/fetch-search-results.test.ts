import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchWithTimer } from "../../src/requests/client-utils";
import { fetchSearchResults } from "../../src/requests/fetch-search-results";

vi.mock("../../src/requests/client-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/requests/client-utils")>();
  return {
    ...actual,
    fetchWithTimer: vi.fn(),
  };
});

describe("fetchSearchResults", () => {
  beforeEach(() => {
    vi.mocked(fetchWithTimer).mockReset();
  });

  it("should successfully fetch and parse search results", async () => {
    const mockPayload = {
      success: true,
      data: [
        { id: "1", title: "Test 1", content: "Content 1", score: 0.9, locale: "zh" },
        { id: "2", title: "Test 2", content: "Content 2", score: 0.8, extra: "ignored" },
      ],
    };

    vi.mocked(fetchWithTimer).mockResolvedValue({
      status: 200,
      durationMs: 50,
      payload: mockPayload,
      rawPayload: mockPayload,
    });

    const result = await fetchSearchResults({
      apiBaseUrl: "http://example.com",
      query: "test search",
      limit: 10,
      locale: "zh",
    });

    expect(fetchWithTimer).toHaveBeenCalledTimes(1);
    expect(fetchWithTimer).toHaveBeenCalledWith(
      expect.stringContaining("/api/search?q=test+search&limit=10&locale=zh"),
      {
        method: "GET",
      },
    );

    expect(result.payload.success).toBe(true);
    expect(result.payload.data).toHaveLength(2);
    expect(result.payload.data[0]).toEqual({
      id: "1",
      title: "Test 1",
      content: "Content 1",
      score: 0.9,
      locale: "zh",
    });
    // Extra fields should be stripped out
    expect(result.payload.data[1]).toEqual({ id: "2", title: "Test 2", content: "Content 2", score: 0.8 });
  });

  it("should filter out invalid search results", async () => {
    const mockPayload = {
      success: true,
      data: [
        { id: "1", title: "Test 1", content: "Content 1", score: 0.9 },
        { id: "2" }, // missing fields
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

    const result = await fetchSearchResults({
      apiBaseUrl: "http://example.com",
      query: "test",
      limit: 5,
      locale: "zh",
    });

    expect(result.payload.data).toHaveLength(1);
    expect(result.payload.data[0]).toEqual({ id: "1", title: "Test 1", content: "Content 1", score: 0.9 });
  });

  it("should throw an error if payload is not an object", async () => {
    vi.mocked(fetchWithTimer).mockResolvedValue({
      status: 200,
      durationMs: 50,
      payload: "string response",
      rawPayload: "string response",
    });

    await expect(
      fetchSearchResults({
        apiBaseUrl: "http://example.com",
        query: "test",
        limit: 5,
        locale: "zh",
      }),
    ).rejects.toThrowError("Invalid search response format");
  });

  it("should throw an error if data field is missing or not an array", async () => {
    vi.mocked(fetchWithTimer).mockResolvedValue({
      status: 200,
      durationMs: 50,
      payload: { success: true, items: [] },
      rawPayload: { success: true, items: [] },
    });

    await expect(
      fetchSearchResults({
        apiBaseUrl: "http://example.com",
        query: "test",
        limit: 5,
        locale: "zh",
      }),
    ).rejects.toThrowError("Search response is missing the data field");
  });
});
