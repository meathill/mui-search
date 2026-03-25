-- Migration number: 0001 	 2026-02-27T02:17:58.480Z

CREATE TABLE IF NOT EXISTS search_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  query TEXT NOT NULL,
  locale TEXT NOT NULL,
  result_count INTEGER NOT NULL,
  top_result_id TEXT,
  top_result_title TEXT,
  top_result_locale TEXT NOT NULL,
  requested_at TEXT NOT NULL,
  hour_bucket TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_search_history_requested_at ON search_history(requested_at);
CREATE INDEX IF NOT EXISTS idx_search_history_locale_hour ON search_history(locale, hour_bucket);

CREATE TABLE IF NOT EXISTS click_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  query TEXT NOT NULL,
  locale TEXT NOT NULL,
  content_id TEXT NOT NULL,
  content_title TEXT NOT NULL,
  content_locale TEXT NOT NULL,
  clicked_at TEXT NOT NULL,
  hour_bucket TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_click_history_clicked_at ON click_history(clicked_at);
CREATE INDEX IF NOT EXISTS idx_click_history_locale_hour ON click_history(content_locale, hour_bucket);

CREATE TABLE IF NOT EXISTS hourly_hot_contents (
  hour_bucket TEXT NOT NULL,
  locale TEXT NOT NULL,
  content_id TEXT NOT NULL,
  content_title TEXT NOT NULL,
  hit_count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (hour_bucket, locale, content_id)
);

CREATE INDEX IF NOT EXISTS idx_hourly_hot_contents_hour_locale ON hourly_hot_contents(hour_bucket, locale);
