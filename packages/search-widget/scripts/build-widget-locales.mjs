import { readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const DEFAULT_CONTENT_ROOT = path.resolve(process.cwd(), "../content-source");
const OUTPUT_FILE_PATH = path.resolve(process.cwd(), "src/shared/supported-locales.ts");
const LOCALE_PATTERN = /^[a-z]{2}(?:-[a-z]{2})?$/i;
const IGNORED_DIRECTORIES = new Set([".git", "node_modules", ".scripts", ".docs", ".shared"]);

void main();

async function main() {
  const contentRoot = path.resolve(process.cwd(), process.env.CONTENT_ROOT ?? DEFAULT_CONTENT_ROOT);
  const locales = await collectLocales(contentRoot);
  const normalizedLocales = locales.sort((left, right) => left.localeCompare(right, "en"));

  if (normalizedLocales.length === 0) {
    throw new Error(`[widget-locales] 未扫描到可用语言目录，请检查 CONTENT_ROOT: ${contentRoot}`);
  }

  const fileContent = buildOutputFileContent(normalizedLocales);
  await writeFile(OUTPUT_FILE_PATH, fileContent, "utf-8");

  console.log(`[widget-locales] 已写入 ${normalizedLocales.length} 个语言到 ${OUTPUT_FILE_PATH}`);
  console.log(`[widget-locales] ${normalizedLocales.join(", ")}`);
}

async function collectLocales(rootDirectory) {
  const pendingDirectories = [rootDirectory];
  const locales = new Set();

  while (pendingDirectories.length > 0) {
    const currentDirectory = pendingDirectories.pop();
    if (!currentDirectory) {
      continue;
    }

    let entries;
    try {
      entries = await readdir(currentDirectory, { withFileTypes: true });
    } catch (error) {
      throw new Error(`[widget-locales] 无法读取目录 ${currentDirectory}`, { cause: error });
    }

    for (const entry of entries) {
      const currentPath = path.resolve(currentDirectory, entry.name);
      if (entry.isDirectory()) {
        if (IGNORED_DIRECTORIES.has(entry.name)) {
          continue;
        }
        pendingDirectories.push(currentPath);
        continue;
      }

      if (!entry.isFile() || entry.name !== "data.json") {
        continue;
      }

      const locale = normalizeLocaleFromDataJsonPath(currentPath);
      if (locale) {
        locales.add(locale);
      }
    }
  }

  return Array.from(locales);
}

function normalizeLocaleFromDataJsonPath(dataJsonPath) {
  const locale = path.basename(path.dirname(dataJsonPath)).toLowerCase();
  if (!locale) {
    return null;
  }

  if (!LOCALE_PATTERN.test(locale)) {
    return null;
  }

  return locale;
}

function buildOutputFileContent(locales) {
  const list = locales.map((locale) => `  "${locale}"`).join(",\n");

  return `// 由 scripts/build-widget-locales.mjs 自动生成，请勿手改。\nexport const SUPPORTED_LOCALES = [\n${list},\n] as const;\n`;
}
