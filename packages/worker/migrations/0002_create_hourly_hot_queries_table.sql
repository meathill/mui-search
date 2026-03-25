-- Migration number: 0002_create_hourly_hot_queries_table.sql

CREATE TABLE IF NOT EXISTS hourly_hot_queries (
  hour_bucket TEXT NOT NULL,
  locale TEXT NOT NULL,
  query TEXT NOT NULL,
  hit_count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (hour_bucket, locale, query)
);

CREATE INDEX IF NOT EXISTS idx_hourly_hot_queries_hour_locale ON hourly_hot_queries(hour_bucket, locale);
