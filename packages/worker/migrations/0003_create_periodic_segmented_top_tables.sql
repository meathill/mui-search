-- Migration number: 0003_create_periodic_segmented_top_tables.sql

CREATE TABLE IF NOT EXISTS periodic_hot_queries (
  granularity TEXT NOT NULL,
  period_bucket TEXT NOT NULL,
  locale TEXT NOT NULL,
  query TEXT NOT NULL,
  hit_count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (granularity, period_bucket, locale, query)
);

CREATE INDEX IF NOT EXISTS idx_periodic_hot_queries_scope
  ON periodic_hot_queries(granularity, period_bucket, locale);

CREATE TABLE IF NOT EXISTS periodic_hot_contents (
  granularity TEXT NOT NULL,
  period_bucket TEXT NOT NULL,
  locale TEXT NOT NULL,
  content_id TEXT NOT NULL,
  content_title TEXT NOT NULL,
  hit_count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (granularity, period_bucket, locale, content_id)
);

CREATE INDEX IF NOT EXISTS idx_periodic_hot_contents_scope
  ON periodic_hot_contents(granularity, period_bucket, locale);
