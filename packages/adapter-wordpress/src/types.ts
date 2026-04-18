export interface AdapterConfig {
  wpSiteUrl: string;
  wpUsername: string;
  wpAppPassword: string;
  tidbDatabaseUrl: string;
  tidbTableName: string;
  locale: string;
  chunkMaxLength: number;
  postsPerPage: number;
  // 可选：Cloudflare Access Service Token（博客前置了 CF Zero Trust 时需要）
  cfAccessClientId?: string;
  cfAccessClientSecret?: string;
}

export interface WpPost {
  id: number;
  slug: string;
  title: { rendered: string };
  content: { rendered: string };
  excerpt: { rendered: string };
  link: string;
  modified_gmt: string;
  status: string;
  date?: string;
  categories?: number[];
}

export interface ContentChunk {
  slug: string;
  title: string;
  description: string;
  content: string;
  sourcePath: string;
  publishedAt: string | null;
  categoryName: string | null;
  readingTimeMinutes: number | null;
}

export interface SyncResult {
  totalPosts: number;
  totalChunks: number;
  upserted: number;
  deleted: number;
  errors: string[];
}
