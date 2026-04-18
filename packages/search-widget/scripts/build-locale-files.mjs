// 为每个语言包生成独立的分发文件：
//   dist/locale/{code}.js   — IIFE，注册到 window.MuiSearchWidget
//   dist/locale/{code}.mjs  — ESM，调用 mui-search 导出的 registerLocale
//   dist/locale/{code}.cjs  — CJS
//   dist/locale/{code}.d.ts — 空类型声明（side-effect only）
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const cwd = process.cwd();
const localePacksDir = path.resolve(cwd, "src/locale-packs");
const outDir = path.resolve(cwd, "dist/locale");

const FALLBACK_LOCALE = "en";

mkdirSync(outDir, { recursive: true });

const localeFiles = readdirSync(localePacksDir).filter(
  (name) => name.startsWith("locale-") && name.endsWith(".ts"),
);

let emitted = 0;
for (const file of localeFiles) {
  const code = file.replace(/^locale-/, "").replace(/\.ts$/, "");
  if (code === FALLBACK_LOCALE) continue;

  const moduleUrl = pathToFileURL(path.join(localePacksDir, file)).href;
  const mod = await import(moduleUrl);
  const constantName = `LOCALE_PACK_${code.replace(/[^a-z0-9]/gi, "_").toUpperCase()}`;
  const pack = mod[constantName];
  if (!pack) {
    throw new Error(`[build:locales] ${file} 未导出 ${constantName}`);
  }

  const packJson = JSON.stringify(pack);

  const iifeContent = `(function(){var w=typeof window!=='undefined'?window:null;if(!w||!w.MuiSearchWidget||!w.MuiSearchWidget.registerLocale){throw new Error('[mui-search] 请先加载 search.js 再加载 locale/${code}.js');}w.MuiSearchWidget.registerLocale(${JSON.stringify(code)},${packJson});})();
`;
  const esmContent = `import { registerLocale } from "mui-search";
registerLocale(${JSON.stringify(code)}, ${packJson});
`;
  const cjsContent = `"use strict";
var m=require("mui-search");
m.registerLocale(${JSON.stringify(code)},${packJson});
`;
  const dtsContent = `export {};
`;

  writeFileSync(path.join(outDir, `${code}.js`), iifeContent, "utf-8");
  writeFileSync(path.join(outDir, `${code}.mjs`), esmContent, "utf-8");
  writeFileSync(path.join(outDir, `${code}.cjs`), cjsContent, "utf-8");
  writeFileSync(path.join(outDir, `${code}.d.ts`), dtsContent, "utf-8");
  emitted += 1;
}

console.log(`[build:locales] 生成 ${emitted} 个 locale 分发文件（${outDir}）`);
