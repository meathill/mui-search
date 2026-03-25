import type { HybridSearchResult, SuggestionItem } from "@mui-search/shared";
import { mergeRankedResults } from "../ranking/rrf";
import type { RankedDocument, TiDBRepository } from "../types";

interface HybridSearchServiceOptions {
  repository: TiDBRepository;
}

export function createHybridSearchService(options: HybridSearchServiceOptions): {
  querySuggestions(query: string, limit: number, locale?: string): Promise<SuggestionItem[]>;
  queryHybridSearch(query: string, limit: number, locale?: string): Promise<HybridSearchResult[]>;
} {
  return {
    querySuggestions(query: string, limit: number, locale?: string) {
      return options.repository.querySuggestions(query, limit, locale);
    },

    async queryHybridSearch(query: string, limit: number, locale?: string): Promise<HybridSearchResult[]> {
      const keywordMatches = await options.repository.queryKeywordMatches(query, limit, locale);

      if (keywordMatches.length >= limit) {
        return mergeRankedResults(keywordMatches, [], limit, { query });
      }

      const vectorMatches = await options.repository
        .queryVectorMatches(query, limit, locale)
        .catch(function handleVectorError(error) {
          console.error("[hybrid-search] 向量召回失败，已自动降级为关键词结果", error);
          return [];
        });

      return mergeRankedResults(keywordMatches, vectorMatches, limit, {
        query,
      });
    },
  };
}
