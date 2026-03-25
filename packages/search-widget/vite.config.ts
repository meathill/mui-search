import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { defineConfig, loadEnv, normalizePath } from "vite";
import { WIDGET_LOCALES } from "./src/widget-locales";

const DEFAULT_LOCALE = "en";
const FALLBACK_LOCALE = "en";
const ACTIVE_LOCALE_ALIAS = "./active-locale-packs";
const LOCALE_PACKS_CONSTANTS_FILE_PATH = resolve(__dirname, "src/locale-packs/constants.ts");
const LOCALE_PACK_TYPES_FILE_PATH = resolve(__dirname, "src/locale-packs/types.ts");
const GENERATED_LOCALE_DIR = resolve(__dirname, ".tmp/widget-locales");
const PACKAGE_JSON_FILE_PATH = resolve(__dirname, "package.json");

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const publicUrl = env.PUBLIC_URL || "";
  const siteUrl = env.SITE_URL || "";
  const widgetVersion = resolveWidgetVersion();
  const bundleLocale = resolveBundleLocale();
  const activeLocalePackModulePath = createActiveLocalePackModule(bundleLocale);
  const emptyOutDir = process.env.WIDGET_EMPTY_OUT_DIR === "1";

  return {
    publicDir: false,
    define: {
      "process.env.PUBLIC_URL": JSON.stringify(publicUrl),
      "process.env.SITE_URL": JSON.stringify(siteUrl),
      "process.env.WIDGET_VERSION": JSON.stringify(widgetVersion),
    },
    resolve: {
      alias: [
        {
          find: ACTIVE_LOCALE_ALIAS,
          replacement: normalizePath(activeLocalePackModulePath),
        },
      ],
    },
    esbuild: {
      jsx: "automatic",
      jsxImportSource: "preact",
      target: "es2022",
    },
    build: {
      target: "es2022",
      outDir: "dist",
      emptyOutDir,
      lib: {
        entry: resolve(__dirname, "src/search-entry.tsx"),
        formats: ["iife"],
        name: "MuiSearchWidget",
      },
      rollupOptions: {
        output: {
          format: "iife",
          name: "MuiSearchWidget",
          entryFileNames: `search.${widgetVersion}.${bundleLocale}.js`,
          inlineDynamicImports: true,
        },
      },
    },
  };
});

function resolveBundleLocale(): string {
  const rawLocale = process.env.WIDGET_BUILD_LOCALE?.trim().toLowerCase();
  if (!rawLocale) {
    return DEFAULT_LOCALE;
  }

  if (!isWidgetLocale(rawLocale)) {
    throw new Error(`[build:widget] 不支持的语言：${rawLocale}`);
  }

  return rawLocale;
}

function createActiveLocalePackModule(bundleLocale: string): string {
  const localePacks = bundleLocale === FALLBACK_LOCALE ? [FALLBACK_LOCALE] : [FALLBACK_LOCALE, bundleLocale];
  const uniqueLocalePacks = Array.from(new Set(localePacks));
  const constantNames = uniqueLocalePacks.map(localeToPackConstant);
  const outputPath = resolve(GENERATED_LOCALE_DIR, `active-locale-packs.${bundleLocale}.ts`);

  mkdirSync(GENERATED_LOCALE_DIR, { recursive: true });

  const fileContent = [
    `import type { LocaleTranslationPack } from "${normalizePath(LOCALE_PACK_TYPES_FILE_PATH)}";`,
    `import { ${constantNames.join(", ")} } from "${normalizePath(LOCALE_PACKS_CONSTANTS_FILE_PATH)}";`,
    "",
    "export const ACTIVE_LOCALE_PACKS: Record<string, LocaleTranslationPack> = {",
    ...uniqueLocalePacks.map((locale) => `  ${JSON.stringify(locale)}: ${localeToPackConstant(locale)},`),
    "};",
    "",
  ].join("\n");

  writeFileSync(outputPath, fileContent, "utf-8");

  console.log(`[build:widget] 构建语言 ${bundleLocale}，打包文案: ${uniqueLocalePacks.join(", ")}`);
  console.log(`[build:widget] emptyOutDir = ${emptyOutDirFromEnv()}`);
  return outputPath;
}

function localeToPackConstant(locale: string): string {
  return `LOCALE_PACK_${locale.replace(/[^a-z0-9]/gi, "_").toUpperCase()}`;
}

function isWidgetLocale(locale: string): locale is (typeof WIDGET_LOCALES)[number] {
  return WIDGET_LOCALES.includes(locale as (typeof WIDGET_LOCALES)[number]);
}

function emptyOutDirFromEnv(): string {
  if (process.env.WIDGET_EMPTY_OUT_DIR === "1") {
    return "true";
  }

  return "false";
}

function resolveWidgetVersion(): string {
  const packageJson = JSON.parse(readFileSync(PACKAGE_JSON_FILE_PATH, "utf-8")) as {
    version?: unknown;
  };
  const version = typeof packageJson.version === "string" ? packageJson.version.trim() : "";

  if (!version) {
    throw new Error("[build:widget] package.json 缺少 version，无法生成版本化文件名");
  }

  return version;
}
