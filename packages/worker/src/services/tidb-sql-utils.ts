export function sanitizeTableName(tableName: string): string {
  const pattern = /^[a-zA-Z0-9_]+$/;
  if (!pattern.test(tableName)) {
    throw new Error(`非法表名: ${tableName}`);
  }

  return tableName;
}

export function toSqlStringLiteral(value: string): string {
  return `'${value.replaceAll("\\", "\\\\").replaceAll("'", "''")}'`;
}

export function toSqlIntegerLiteral(value: number): string {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`非法整数: ${value}`);
  }

  return String(value);
}

export function normalizeSearchQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, " ");
}

export function normalizeLocale(locale?: string): string | undefined {
  const normalizedLocale = locale?.trim().toLowerCase();
  if (!normalizedLocale || normalizedLocale === "all") {
    return undefined;
  }

  return normalizedLocale;
}

export function shouldFallbackToLike(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error ?? "").toLowerCase();

  return (
    message.includes("fts_match_word") ||
    message.includes("non-constant string") ||
    message.includes("must be used alone") ||
    message.includes("fulltext") ||
    message.includes("with parser") ||
    message.includes("unknown function") ||
    message.includes("index")
  );
}
