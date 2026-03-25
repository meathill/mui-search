import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createHybridSearchService } from "../src/services/hybrid-search";
import type { RankedDocument, TiDBRepository } from "../src/types";

const KEYWORD_ROWS: RankedDocument[] = [
  {
    id: "1",
    title: "How Smart Are You",
    content: "keyword content",
    locale: "en",
  },
];

describe("createHybridSearchService", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("向量查询失败时降级为关键词召回", async () => {
    const repository = createRepositoryMock({
      queryVectorMatches: vi.fn(async () => {
        throw new Error("VEC_EMBED_COSINE_DISTANCE failed");
      }),
    });

    const service = createHybridSearchService({ repository });
    const result = await service.queryHybridSearch("how", 10);

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("1");
    expect(repository.queryVectorMatches).toHaveBeenCalledTimes(1);
  });

  it("向 TiDB 查询传递 locale 参数", async () => {
    const repository = createRepositoryMock();

    const service = createHybridSearchService({ repository });
    await service.queryHybridSearch("how", 10, "en");

    expect(repository.queryKeywordMatches).toHaveBeenCalledWith("how", 10, "en");
    expect(repository.queryVectorMatches).toHaveBeenCalledWith("how", 10, "en");
  });

  it("标题命中关键词时应优先于仅向量高分结果", async () => {
    const repository = createRepositoryMock({
      queryKeywordMatches: vi.fn(async () => {
        return [
          {
            id: "animal",
            title: "What Animal Am I?",
            content: "animal personality quiz",
            locale: "en",
          },
          {
            id: "hero",
            title: "Which My Hero Academia Character Are You?",
            content: "anime personality quiz",
            locale: "en",
          },
        ];
      }),
      queryVectorMatches: vi.fn(async () => {
        return [
          {
            id: "hero",
            title: "Which My Hero Academia Character Are You?",
            content: "anime personality quiz",
            locale: "en",
          },
        ];
      }),
    });

    const service = createHybridSearchService({ repository });
    const result = await service.queryHybridSearch("what animal", 10, "en");

    expect(result[0]?.id).toBe("animal");
    expect(result[1]?.id).toBe("hero");
  });
});

function createRepositoryMock(overrides: Partial<TiDBRepository> = {}): TiDBRepository {
  return {
    querySuggestions: vi.fn(async () => []),
    queryKeywordMatches: vi.fn(async () => KEYWORD_ROWS),
    queryVectorMatches: vi.fn(async () => []),
    ...overrides,
  };
}
