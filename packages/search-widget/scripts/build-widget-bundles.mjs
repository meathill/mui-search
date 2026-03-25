import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const cwd = process.cwd();
const pnpmCmd = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

const locales = parseWidgetLocales(
  readFileSync(path.resolve(cwd, "../../packages/shared/src/supported-locales.ts"), "utf-8"),
);

const targetLocale = process.env.WIDGET_BUILD_LOCALE?.trim().toLowerCase();
const buildLocales = targetLocale ? [targetLocale] : locales;

console.log(`[build:widget] 计划构建 ${buildLocales.length} 个语言包: ${buildLocales.join(", ")}`);

for (const [index, locale] of buildLocales.entries()) {
  console.log(`[build:widget] (${index + 1}/${buildLocales.length}) 开始构建 ${locale}`);
  execFileSync(pnpmCmd, ["exec", "vite", "build", "--config", "vite.config.ts"], {
    stdio: "inherit",
    env: {
      ...process.env,
      WIDGET_BUILD_LOCALE: locale,
      WIDGET_EMPTY_OUT_DIR: index === 0 ? "1" : "0",
    },
  });
}

console.log(`[build:widget] 全部构建完成，共 ${buildLocales.length} 个语言包`);

function parseWidgetLocales(fileContent) {
  const matches = String(fileContent).matchAll(/"([a-z]{2}(?:-[a-z]{2})?)"/gi);
  const localeList = Array.from(matches, (match) => match[1]?.toLowerCase()).filter(Boolean);
  return Array.from(new Set(localeList));
}
