import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { defineConfig } from "vite";

const PACKAGE_JSON_FILE_PATH = resolve(__dirname, "package.json");

export default defineConfig(() => {
  const widgetVersion = resolveWidgetVersion();

  return {
    publicDir: false,
    define: {
      "process.env.PUBLIC_URL": JSON.stringify(""),
      "process.env.SITE_URL": JSON.stringify(""),
      "process.env.WIDGET_VERSION": JSON.stringify(widgetVersion),
    },
    esbuild: {
      jsx: "automatic",
      jsxImportSource: "preact",
      target: "es2022",
    },
    build: {
      target: "es2022",
      outDir: "dist",
      emptyOutDir: false,
      sourcemap: true,
      lib: {
        entry: resolve(__dirname, "src/index.ts"),
        formats: ["es", "cjs"],
        fileName: (format) => (format === "es" ? "mui-search.mjs" : "mui-search.cjs"),
      },
      rollupOptions: {
        output: {
          exports: "named",
          inlineDynamicImports: true,
        },
      },
    },
  };
});

function resolveWidgetVersion(): string {
  const packageJson = JSON.parse(readFileSync(PACKAGE_JSON_FILE_PATH, "utf-8")) as { version?: unknown };
  const version = typeof packageJson.version === "string" ? packageJson.version.trim() : "";
  if (!version) {
    throw new Error("[build:lib] package.json 缺少 version");
  }
  return version;
}
