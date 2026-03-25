/**
 * 从 TS 样式模块中提取 CSS 字符串，输出为独立 .css 文件。
 * 用于 npm 发布，让用户可以单独引用 widget 样式。
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const cwd = process.cwd();
const outDir = resolve(cwd, "dist");
const stylesDir = resolve(cwd, "src/styles");

const STYLE_FILES = [
  "root-and-controls.ts",
  "suggestion-and-hot.ts",
  "results-and-motion.ts",
  "media-queries.ts",
  "dialog.ts",
];

function extractCssFromTsFile(filePath) {
  const content = readFileSync(filePath, "utf-8");
  // 匹配模板字符串中的 CSS 内容：export const XXX = `...`;
  const match = content.match(/= `([\s\S]*?)`;/);
  return match ? match[1].trim() : "";
}

const segments = STYLE_FILES.map((file) => extractCssFromTsFile(resolve(stylesDir, file)));
const cssText = `${segments.join("\n\n")}\n`;

mkdirSync(outDir, { recursive: true });
const outFile = resolve(outDir, "search-widget.css");
writeFileSync(outFile, cssText, "utf-8");

console.log(`[build:css] 已生成 ${outFile}（${cssText.length} 字节）`);
