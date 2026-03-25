import { connect } from "@tidbcloud/serverless";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTiDBRepository } from "../src/services/tidb-repository";

vi.mock("@tidbcloud/serverless", () => {
  return {
    connect: vi.fn(),
  };
});

const executeMock = vi.fn();

beforeEach(() => {
  executeMock.mockReset();

  const connectMock = connect as unknown as ReturnType<typeof vi.fn>;
  connectMock.mockReset();
  connectMock.mockReturnValue({
    execute: executeMock,
  });
});

describe("createTiDBRepository", () => {
  it("suggest 查询大小写不敏感并返回排序参数", async () => {
    executeMock.mockResolvedValue([
      {
        id: 1,
        slug: "how-smart-are-you",
        locale: "en",
        text: "How Smart Are You?",
      },
    ]);

    const repository = createTiDBRepository({
      databaseUrl: "mysql://root:password@127.0.0.1:4000/search",
      tableName: "documents",
    });

    const result = await repository.querySuggestions("HoW", 8);

    expect(executeMock).toHaveBeenCalledTimes(1);
    const [sql, params] = executeMock.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("LOWER(title) LIKE ?");
    expect(params).toEqual(["%how%", "how", "how%", 8]);
    expect(result).toEqual([
      {
        id: "how-smart-are-you",
        text: "How Smart Are You?",
        locale: "en",
      },
    ]);
  });

  it("suggest 在提供 locale 时应严格按语言过滤并归一化 locale", async () => {
    executeMock.mockResolvedValue([]);

    const repository = createTiDBRepository({
      databaseUrl: "mysql://root:password@127.0.0.1:4000/search",
      tableName: "documents",
    });

    await repository.querySuggestions("how", 8, "EN");

    const [sql, params] = executeMock.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("AND locale = ?");
    expect(sql).not.toContain("CASE WHEN LOWER(locale) = ? THEN 0 ELSE 1 END");
    expect(params).toEqual(["%how%", "en", "how", "how%", 8]);
  });

  it("keyword 查询优先使用 TiDB Full-Text", async () => {
    executeMock
      .mockResolvedValueOnce([
        {
          id: 9,
          slug: "what-animal-am-i",
          title: "What Animal Am I?",
          content: "animal personality quiz",
          locale: "en",
          title_fts_score: 0.52,
          content_fts_score: 0,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 9,
          slug: "what-animal-am-i",
          title: "What Animal Am I?",
          content: "animal personality quiz",
          locale: "en",
          title_fts_score: 0,
          content_fts_score: 0.4,
        },
      ]);

    const repository = createTiDBRepository({
      databaseUrl: "mysql://root:password@127.0.0.1:4000/search",
      tableName: "documents",
    });

    const result = await repository.queryKeywordMatches("What Animal", 8, "EN");

    expect(executeMock).toHaveBeenCalledTimes(2);
    const [titleSql, titleParams] = executeMock.mock.calls[0] as [string, unknown[]];
    const [contentSql, contentParams] = executeMock.mock.calls[1] as [string, unknown[]];

    expect(titleSql).toContain("fts_match_word('what animal', title)");
    expect(titleSql).toContain("WHERE fts_match_word('what animal', title)");
    expect(titleSql).toContain("AND locale = ?");
    expect(titleSql).toContain("LIMIT 8");
    expect(titleSql).not.toContain("fts_match_word(?, title)");
    expect(titleParams).toEqual(["en"]);

    expect(contentSql).toContain("fts_match_word('what animal', content)");
    expect(contentSql).toContain("WHERE fts_match_word('what animal', content)");
    expect(contentSql).toContain("AND locale = ?");
    expect(contentSql).toContain("LIMIT 8");
    expect(contentSql).not.toContain("fts_match_word(?, content)");
    expect(contentParams).toEqual(["en"]);
    expect(result).toEqual([
      {
        id: "9",
        slug: "what-animal-am-i",
        title: "What Animal Am I?",
        content: "animal personality quiz",
        locale: "en",
      },
    ]);
  });

  it("Full-Text 不可用时自动回退到 LIKE", async () => {
    executeMock.mockRejectedValueOnce(new Error("Unknown function: fts_match_word"));
    executeMock.mockRejectedValueOnce(new Error("Unknown function: fts_match_word"));
    executeMock.mockResolvedValueOnce([
      {
        id: 11,
        title: "How Smart Are You?",
        content: "desc",
        locale: "en",
      },
    ]);

    const repository = createTiDBRepository({
      databaseUrl: "mysql://root:password@127.0.0.1:4000/search",
      tableName: "documents",
    });

    const result = await repository.queryKeywordMatches("how", 8);

    expect(executeMock).toHaveBeenCalledTimes(3);
    const [firstSql, firstParams] = executeMock.mock.calls[0] as [string, unknown[]];
    const [lastSql, lastParams] = executeMock.mock.calls[2] as [string, unknown[]];
    expect(firstSql).toContain("fts_match_word('how', title)");
    expect(firstParams).toEqual([]);
    expect(lastSql).toContain("LOWER(title) LIKE ? OR LOWER(content) LIKE ?");
    expect(lastParams).toEqual(["%how%", "%how%", "how", "how%", "%how%", 8]);
    expect(result[0]?.id).toBe("11");
  });

  it("遇到 non-constant string 错误时自动回退到 LIKE", async () => {
    executeMock.mockRejectedValueOnce(
      new Error("This version of TiDB doesn't yet support 'match against a non-constant string'"),
    );
    executeMock.mockRejectedValueOnce(
      new Error("This version of TiDB doesn't yet support 'match against a non-constant string'"),
    );
    executeMock.mockResolvedValueOnce([
      {
        id: 12,
        title: "Body Position Quiz",
        content: "desc",
        locale: "en",
      },
    ]);

    const repository = createTiDBRepository({
      databaseUrl: "mysql://root:password@127.0.0.1:4000/search",
      tableName: "documents",
    });

    const result = await repository.queryKeywordMatches("body position", 6);

    expect(executeMock).toHaveBeenCalledTimes(3);
    const [firstSql] = executeMock.mock.calls[0] as [string, unknown[]];
    const [lastSql, lastParams] = executeMock.mock.calls[2] as [string, unknown[]];
    expect(firstSql).toContain("fts_match_word('body position', title)");
    expect(lastSql).toContain("LOWER(title) LIKE ? OR LOWER(content) LIKE ?");
    expect(lastParams).toEqual([
      "%body position%",
      "%body position%",
      "body position",
      "body position%",
      "%body position%",
      6,
    ]);
    expect(result[0]?.id).toBe("12");
  });

  it("vector 查询在 locale 生效时先取 TopN id 再回表", async () => {
    executeMock.mockResolvedValue([
      {
        id: 7,
        title: "How Smart Are You?",
        content: "desc",
        locale: "en",
      },
    ]);

    const repository = createTiDBRepository({
      databaseUrl: "mysql://root:password@127.0.0.1:4000/search",
      tableName: "documents",
    });

    const result = await repository.queryVectorMatches("How Smart", 5, "EN");

    const [sql, params] = executeMock.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("INNER JOIN (");
    expect(sql).toContain("WHERE locale = ?");
    expect(sql).toContain("VEC_EMBED_COSINE_DISTANCE(embedding, ?)");
    expect(sql).toContain("ORDER BY ranked.distance ASC");
    expect(params).toEqual(["how smart", "en", 5]);
    expect(result[0]?.locale).toBe("en");
  });

  it("非法表名直接抛错", () => {
    expect(() => {
      createTiDBRepository({
        databaseUrl: "mysql://root:password@127.0.0.1:4000/search",
        tableName: "documents;drop",
      });
    }).toThrow("非法表名");
  });
});
