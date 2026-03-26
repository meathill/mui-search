import { parseArgs } from "node:util";
import { loadConfig } from "./config";
import type { SyncResult } from "./types";
import { syncFull, syncIncremental } from "./sync";

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    "dry-run": { type: "boolean", default: false },
    verbose: { type: "boolean", default: false },
  },
});

const command = positionals[0] ?? "sync";
const dryRun = values["dry-run"] ?? false;

async function main(): Promise<void> {
  const config = loadConfig();

  console.log(`WordPress Adapter: ${command}`);
  console.log(`站点: ${config.wpSiteUrl}`);
  console.log(`目标表: ${config.tidbTableName}`);
  console.log(`语言: ${config.locale}`);
  if (dryRun) {
    console.log("[dry-run 模式]");
  }
  console.log("---");

  const result: SyncResult = await runCommand(command);

  console.log("---");
  console.log(`文章数: ${result.totalPosts}`);
  console.log(`分块数: ${result.totalChunks}`);
  console.log(`写入数: ${result.upserted}`);
  console.log(`删除数: ${result.deleted}`);

  if (result.errors.length > 0) {
    console.error(`\n错误 (${result.errors.length}):`);
    for (const error of result.errors) {
      console.error(`  - ${error}`);
    }
    process.exit(1);
  }

  async function runCommand(cmd: string): Promise<SyncResult> {
    switch (cmd) {
      case "sync":
        return syncIncremental(config, dryRun);
      case "sync:full":
        return syncFull(config, dryRun);
      default:
        console.error(`未知命令: ${cmd}`);
        console.error("可用命令: sync, sync:full");
        process.exit(1);
    }
  }
}

main().catch(function handleError(error) {
  console.error("同步失败:", error);
  process.exit(1);
});
