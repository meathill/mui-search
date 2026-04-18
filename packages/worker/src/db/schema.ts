import { sql } from "drizzle-orm";
import {
  bigint,
  customType,
  datetime,
  index,
  int,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

const vector1024 = customType<{ data: string }>({
  dataType() {
    return "vector(1024)";
  },
});

const DEFAULT_TIDB_EMBEDDING_MODEL = "tidbcloud_free/amazon/titan-embed-text-v2";

export const documents = mysqlTable(
  "documents",
  {
    id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    slug: varchar("slug", { length: 255 }).notNull(),
    locale: varchar("locale", { length: 16 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description").notNull(),
    content: text("content").notNull(),
    sourcePath: varchar("source_path", { length: 1024 }).notNull(),
    embedding: vector1024("embedding")
      .generatedAlwaysAs(sql.raw(`EMBED_TEXT("${DEFAULT_TIDB_EMBEDDING_MODEL}", content)`), { mode: "stored" })
      .notNull(),
    publishedAt: datetime("published_at"),
    categoryName: varchar("category_name", { length: 255 }),
    readingTimeMinutes: int("reading_time_minutes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  function defineIndexes(table) {
    return {
      uniqSlugLocale: uniqueIndex("uniq_slug_locale").on(table.slug, table.locale),
      idxLocale: index("idx_locale").on(table.locale),
      idxTitle: index("idx_title").on(table.title),
    };
  },
);

export const seedSyncState = mysqlTable("seed_sync_state", {
  scope: varchar("scope", { length: 64 }).primaryKey(),
  sourceCommit: varchar("source_commit", { length: 64 }).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
