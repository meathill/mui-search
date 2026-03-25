import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const PACKAGE_JSON_FILE_PATH = resolve(__dirname, "package.json");

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const publicUrl = env.PUBLIC_URL || "";
  const siteUrl = env.SITE_URL || "";
  const widgetVersion = resolveWidgetVersion();

  return {
    appType: "mpa",
    plugins: [tailwindcss(), react()],
    define: {
      "process.env.PUBLIC_URL": JSON.stringify(publicUrl),
      "process.env.SITE_URL": JSON.stringify(siteUrl),
      "process.env.WIDGET_VERSION": JSON.stringify(widgetVersion),
    },
    build: {
      outDir: resolve(__dirname, "../worker/dist"),
      emptyOutDir: true,
      rollupOptions: {
        input: {
          main: resolve(__dirname, "index.html"),
          playground: resolve(__dirname, "playground.html"),
          stats: resolve(__dirname, "stat.html"),
          demo: resolve(__dirname, "search-widget-demo.html"),
        },
        output: {
          manualChunks(id) {
            if (id.includes("/node_modules/zrender/")) {
              return "zrender-vendor";
            }

            if (id.includes("/node_modules/echarts/")) {
              return "echarts-vendor";
            }

            return undefined;
          },
        },
      },
    },
    server: {
      host: "127.0.0.1",
      port: 5173,
    },
  };
});

function resolveWidgetVersion(): string {
  const packageJson = JSON.parse(readFileSync(PACKAGE_JSON_FILE_PATH, "utf-8")) as {
    version?: unknown;
  };
  const version = typeof packageJson.version === "string" ? packageJson.version.trim() : "";
  if (!version) {
    throw new Error("[vite] package.json 缺少 version");
  }

  return version;
}
