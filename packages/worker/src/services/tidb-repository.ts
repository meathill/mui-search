import { connect } from "@tidbcloud/serverless";

import type { SuggestionItem } from "@mui-search/shared";
import type { RankedDocument, TiDBRepository } from "../types";
import {
  mergeAndRankFullTextRows,
  toRankedDocument,
  toSuggestion,
  type TiDBDocumentRow,
  type TiDBSuggestionRow,
} from "./tidb-row-transforms";
import {
  normalizeLocale,
  normalizeSearchQuery,
  sanitizeTableName,
  shouldFallbackToLike,
  toSqlIntegerLiteral,
  toSqlStringLiteral,
} from "./tidb-sql-utils";

interface TiDBRepositoryOptions {
  databaseUrl: string;
  tableName: string;
}

export function createTiDBRepository(options: TiDBRepositoryOptions): TiDBRepository {
  const tableName = sanitizeTableName(options.tableName);
  const connection = connect({ url: options.databaseUrl });

  return {
    async querySuggestions(query: string, limit: number, locale?: string): Promise<SuggestionItem[]> {
      const normalizedQuery = normalizeSearchQuery(query);
      if (!normalizedQuery) {
        return [];
      }

      const containsQuery = `%${normalizedQuery}%`;
      const prefixQuery = `${normalizedQuery}%`;
      const normalizedLocale = normalizeLocale(locale);
      const localeFilterSql = normalizedLocale ? "AND locale = ?" : "";

      const rows = (await connection.execute(
        `SELECT CAST(id AS CHAR) AS id, slug, locale, title AS text
         FROM ${tableName}
         WHERE LOWER(title) LIKE ?
           ${localeFilterSql}
         ORDER BY
           CASE
             WHEN LOWER(title) = ? THEN 0
             WHEN LOWER(title) LIKE ? THEN 1
             ELSE 2
           END,
           id DESC
         LIMIT ?`,
        normalizedLocale
          ? [containsQuery, normalizedLocale, normalizedQuery, prefixQuery, limit]
          : [containsQuery, normalizedQuery, prefixQuery, limit],
      )) as TiDBSuggestionRow[];

      return rows.map(toSuggestion);
    },

    async queryKeywordMatches(query: string, limit: number, locale?: string): Promise<RankedDocument[]> {
      const normalizedQuery = normalizeSearchQuery(query);
      if (!normalizedQuery) {
        return [];
      }

      const normalizedLocale = normalizeLocale(locale);

      try {
        const fullTextRows = await queryKeywordMatchesByFullText(
          connection,
          tableName,
          normalizedQuery,
          limit,
          normalizedLocale,
        );

        return fullTextRows.map(toRankedDocument);
      } catch (error) {
        if (!shouldFallbackToLike(error)) {
          throw error;
        }

        console.error("[tidb-repository] Full-Text 查询失败，降级为 LIKE 关键词召回", error);
        const fallbackRows = await queryKeywordMatchesByLike(
          connection,
          tableName,
          normalizedQuery,
          limit,
          normalizedLocale,
        );
        return fallbackRows.map(toRankedDocument);
      }
    },

    async queryVectorMatches(query: string, limit: number, locale?: string): Promise<RankedDocument[]> {
      const normalizedQuery = normalizeSearchQuery(query);
      if (!normalizedQuery) {
        return [];
      }

      const normalizedLocale = normalizeLocale(locale);
      const localeFilterSql = normalizedLocale ? "WHERE locale = ?" : "";

      const rows = (await connection.execute(
        `SELECT
           CAST(doc.id AS CHAR) AS id,
           doc.slug,
           doc.title,
           LEFT(doc.content, 150) AS content,
           doc.locale
         FROM ${tableName} AS doc
         INNER JOIN (
           SELECT
             id,
             VEC_EMBED_COSINE_DISTANCE(embedding, ?) AS distance
           FROM ${tableName}
           ${localeFilterSql}
           ORDER BY distance ASC
           LIMIT ?
         ) AS ranked
           ON ranked.id = doc.id
         ORDER BY ranked.distance ASC`,
        normalizedLocale ? [normalizedQuery, normalizedLocale, limit] : [normalizedQuery, limit],
      )) as TiDBDocumentRow[];

      return rows.map(toRankedDocument);
    },
  };
}

async function queryKeywordMatchesByFullText(
  connection: { execute(sql: string, params: unknown[]): Promise<unknown> },
  tableName: string,
  normalizedQuery: string,
  limit: number,
  normalizedLocale: string | undefined,
): Promise<TiDBDocumentRow[]> {
  const queryLiteral = toSqlStringLiteral(normalizedQuery);
  const limitLiteral = toSqlIntegerLiteral(limit);
  const localeFilterSql = normalizedLocale ? "AND locale = ?" : "";
  const localeParams = normalizedLocale ? [normalizedLocale] : [];

  const [titleRows, contentRows] = await Promise.all([
    connection.execute(
      `SELECT
         CAST(id AS CHAR) AS id,
         slug,
         title,
         LEFT(content, 150) AS content,
         locale,
         fts_match_word(${queryLiteral}, title) AS title_fts_score,
         0 AS content_fts_score
       FROM ${tableName}
       WHERE fts_match_word(${queryLiteral}, title)
         ${localeFilterSql}
       ORDER BY title_fts_score DESC, id DESC
       LIMIT ${limitLiteral}`,
      localeParams,
    ) as Promise<TiDBDocumentRow[]>,
    connection.execute(
      `SELECT
         CAST(id AS CHAR) AS id,
         slug,
         title,
         LEFT(content, 150) AS content,
         locale,
         0 AS title_fts_score,
         fts_match_word(${queryLiteral}, content) AS content_fts_score
       FROM ${tableName}
       WHERE fts_match_word(${queryLiteral}, content)
         ${localeFilterSql}
       ORDER BY content_fts_score DESC, id DESC
       LIMIT ${limitLiteral}`,
      localeParams,
    ) as Promise<TiDBDocumentRow[]>,
  ]);

  return mergeAndRankFullTextRows(titleRows, contentRows, normalizedQuery, limit);
}

async function queryKeywordMatchesByLike(
  connection: { execute(sql: string, params: unknown[]): Promise<unknown> },
  tableName: string,
  normalizedQuery: string,
  limit: number,
  normalizedLocale: string | undefined,
): Promise<TiDBDocumentRow[]> {
  const containsQuery = `%${normalizedQuery}%`;
  const prefixQuery = `${normalizedQuery}%`;
  const localeFilterSql = normalizedLocale ? "AND locale = ?" : "";

  const rows = (await connection.execute(
    `SELECT CAST(id AS CHAR) AS id, slug, title, LEFT(content, 150) AS content, locale
     FROM ${tableName}
     WHERE (LOWER(title) LIKE ? OR LOWER(content) LIKE ?)
       ${localeFilterSql}
     ORDER BY
       CASE
         WHEN LOWER(title) = ? THEN 0
         WHEN LOWER(title) LIKE ? THEN 1
         WHEN LOWER(content) LIKE ? THEN 2
         ELSE 3
       END,
       id DESC
     LIMIT ?`,
    normalizedLocale
      ? [containsQuery, containsQuery, normalizedLocale, normalizedQuery, prefixQuery, containsQuery, limit]
      : [containsQuery, containsQuery, normalizedQuery, prefixQuery, containsQuery, limit],
  )) as TiDBDocumentRow[];

  return rows;
}
