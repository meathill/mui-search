CREATE TABLE `documents` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `slug` varchar(255) NOT NULL,
  `locale` varchar(16) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `content` text NOT NULL,
  `source_path` varchar(1024) NOT NULL,
  `embedding` vector(1024) GENERATED ALWAYS AS (EMBED_TEXT("tidbcloud_free/amazon/titan-embed-text-v2", `content`)) STORED NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `uniq_slug_locale` (`slug`, `locale`),
  KEY `idx_title` (`title`),
  FULLTEXT INDEX `idx_fts_title`(`title`) WITH PARSER MULTILINGUAL,
  FULLTEXT INDEX `idx_fts_content`(`content`) WITH PARSER MULTILINGUAL,
  VECTOR INDEX `idx_vector_embedding`((VEC_COSINE_DISTANCE(`embedding`)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
