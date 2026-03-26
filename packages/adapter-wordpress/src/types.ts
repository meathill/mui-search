export interface AdapterConfig {
  wpSiteUrl: string;
  wpUsername: string;
  wpAppPassword: string;
  tidbDatabaseUrl: string;
  tidbTableName: string;
  locale: string;
  chunkMaxLength: number;
  postsPerPage: number;
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
}

export interface ContentChunk {
  slug: string;
  title: string;
  description: string;
  content: string;
  sourcePath: string;
}

export interface SyncResult {
  totalPosts: number;
  totalChunks: number;
  upserted: number;
  deleted: number;
  errors: string[];
}
