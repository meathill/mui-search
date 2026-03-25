export type SqlCallLog = {
  sql: string;
  params: unknown[];
  kind: "run" | "all";
};

type SqlResultResolver = (sql: string, params: unknown[]) => unknown[];

export function createLoggedDatabase(resolver?: SqlResultResolver): {
  database: D1Database;
  callLogs: SqlCallLog[];
} {
  const callLogs: SqlCallLog[] = [];
  const database = {
    prepare(sql: string) {
      return {
        bind(...params: unknown[]) {
          return {
            async run() {
              callLogs.push({ sql, params, kind: "run" });
              return { success: true };
            },
            async all() {
              callLogs.push({ sql, params, kind: "all" });
              return {
                results: resolver ? resolver(sql, params) : [],
              };
            },
          };
        },
        async run() {
          callLogs.push({ sql, params: [], kind: "run" });
          return { success: true };
        },
      };
    },
  } as unknown as D1Database;

  return {
    database,
    callLogs,
  };
}
