import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchWithTimer } from "../../src/requests/client-utils";
import { fetchSuggestions } from "../../src/requests/fetch-suggestions";

vi.mock("../../src/requests/client-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/requests/client-utils")>();
  return {
    ...actual,
    fetchWithTimer: vi.fn(),
  };
});

describe("fetchSuggestions", () => {
  beforeEach(() => {
    vi.mocked(fetchWithTimer).mockReset();
  });

  it("should successfully fetch and parse suggestions", async () => {
    const mockPayload = {
      success: true,
      suggestions: [
        { id: "1", text: "test 1" },
        { id: "2", text: "test 2", extra: "ignored" },
      ],
    };

    vi.mocked(fetchWithTimer).mockResolvedValue({
      status: 200,
      durationMs: 50,
      payload: mockPayload,
      rawPayload: mockPayload,
    });

    const result = await fetchSuggestions({
      apiBaseUrl: "http://example.com",
      query: "test",
      limit: 5,
      locale: "zh-CN",
    });

    expect(fetchWithTimer).toHaveBeenCalledTimes(1);
    expect(fetchWithTimer).toHaveBeenCalledWith("http://example.com/api/suggest?q=test&limit=5&locale=zh-CN", {
      method: "GET",
    });

    expect(result.payload.success).toBe(true);
    expect(result.payload.suggestions).toHaveLength(2);
    expect(result.payload.suggestions[0]).toEqual({ id: "1", text: "test 1" });
    // Extra fields should be stripped out
    expect(result.payload.suggestions[1]).toEqual({ id: "2", text: "test 2" });
  });

  it("should filter out invalid suggestions", async () => {
    const mockPayload = {
      success: true,
      suggestions: [
        { id: "1", text: "test 1" },
        { id: "2" }, // missing text
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

    const result = await fetchSuggestions({
      apiBaseUrl: "http://example.com",
      query: "test",
      limit: 5,
      locale: "zh-CN",
    });

    expect(result.payload.suggestions).toHaveLength(1);
    expect(result.payload.suggestions[0]).toEqual({ id: "1", text: "test 1" });
  });

  it("should throw an error if payload is not an object", async () => {
    vi.mocked(fetchWithTimer).mockResolvedValue({
      status: 200,
      durationMs: 50,
      payload: "string response",
      rawPayload: "string response",
    });

    await expect(
      fetchSuggestions({
        apiBaseUrl: "http://example.com",
        query: "test",
        limit: 5,
        locale: "zh-CN",
      }),
    ).rejects.toThrowError("Invalid suggestions response format");
  });

  it("should throw an error if suggestions field is missing or not an array", async () => {
    vi.mocked(fetchWithTimer).mockResolvedValue({
      status: 200,
      durationMs: 50,
      payload: { success: true },
      rawPayload: { success: true },
    });

    await expect(
      fetchSuggestions({
        apiBaseUrl: "http://example.com",
        query: "test",
        limit: 5,
        locale: "zh-CN",
      }),
    ).rejects.toThrowError("Suggestions response is missing the suggestions field");
  });
});
