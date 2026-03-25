import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

import {
  downloadManifestFilesFromR2,
  isWidgetBundleFile,
  publishWidgetBundles,
  readManifestFromR2,
  syncWidgetBundlesFromR2,
  toObjectPath,
  uploadManifestToR2,
  uploadWidgetBundlesToR2,
} from "./build-widget-bundles-r2.mjs";

const DEFAULT_MANIFEST_FILE = "widget-bundles-manifest.json";
const DEFAULT_R2_KEY_PREFIX = "mui-search";
const DEFAULT_R2_BINDING_NAME = "BUCKET";

export function main(options = {}) {
  const context = createBuildContext({
    ...options,
    commandLabel: "build:widget",
  });

  if (!shouldBuildWidgetBundles(context.env)) {
    context.log("[build:widget] CI 环境，跳过当前版本构建，开始从 R2 回填静态产物");
    syncHistoricalWidgetBundlesForCi(context, []);
    context.log("[build:widget] CI 回填完成");
    return;
  }

  const { buildLocales } = buildWidgetBundles(context);
  context.log(`[build:widget] 全部构建完成，共 ${buildLocales.length} 个语言包`);
}

export function upload(options = {}) {
  const context = createBuildContext({
    ...options,
    commandLabel: "upload:widget",
  });
  const builtFiles = collectBuiltWidgetFiles(context.widgetOutputDir, context.readdirSync);
  if (builtFiles.length === 0) {
    throw new Error(`[upload:widget] 未找到可上传文件：${context.widgetOutputDir}，请先执行 pnpm run build:widget`);
  }

  context.log(`[upload:widget] 准备上传 dist/search-widget 中的 ${builtFiles.length} 个文件`);
  publishBuiltWidgetBundles(context, builtFiles);
  context.log(`[upload:widget] 上传完成，共 ${builtFiles.length} 个文件`);
}

function buildWidgetBundles(context) {
  const locales = readWidgetLocalesFromFile(context.widgetLocalesFile, context.readFileSync);
  if (locales.length === 0) {
    throw new Error("[build:widget] 语言清单为空，无法构建");
  }

  const targetLocale = context.env.WIDGET_BUILD_LOCALE?.trim().toLowerCase();
  const buildLocales = resolveBuildLocales(locales, targetLocale);

  context.log(`[build:widget] 计划构建 ${buildLocales.length} 个语言包: ${buildLocales.join(", ")}`);

  for (const [index, locale] of buildLocales.entries()) {
    const buildNumber = index + 1;
    const isFirstBuild = index === 0;

    context.log(`[build:widget] (${buildNumber}/${buildLocales.length}) 开始构建 ${locale}`);
    runViteBuild(context, locale, isFirstBuild);
  }

  const builtFiles = collectBuiltWidgetFiles(context.widgetOutputDir, context.readdirSync);
  if (builtFiles.length === 0) {
    throw new Error(`[build:widget] 未找到构建产物：${context.widgetOutputDir}`);
  }

  return {
    buildLocales,
    builtFiles,
  };
}

function publishBuiltWidgetBundles(context, builtFiles) {
  const bucketName = resolveBucketName({
    commandLabel: context.commandLabel,
    env: context.env,
    wranglerConfigFile: context.wranglerConfigFile,
    r2BindingName: context.r2BindingName,
    readFileSync: context.readFileSync,
  });

  publishWidgetBundles({
    bucketName,
    builtFiles,
    manifestSeedRaw: context.env.WIDGET_R2_MANIFEST_SEED,
    readManifestFromR2: function readManifestFromR2WithContext(targetBucketName) {
      return readManifestFromR2({
        bucketName: targetBucketName,
        manifestFileName: context.widgetR2ManifestFile,
        r2KeyPrefix: context.r2KeyPrefix,
        runWranglerR2Command: function runWranglerGetCommand(args, stdio) {
          runWranglerR2Command(args, stdio, context);
        },
        readFileSync: context.readFileSync,
        mkdtempSync: context.mkdtempSync,
        rmSync: context.rmSync,
        now: context.now,
        logLabel: context.commandLabel,
        log: context.log,
      });
    },
    uploadWidgetBundlesToR2: function uploadWidgetBundlesToR2WithContext(targetBucketName, files) {
      uploadWidgetBundlesToR2({
        bucketName: targetBucketName,
        files,
        widgetOutputDir: context.widgetOutputDir,
        r2KeyPrefix: context.r2KeyPrefix,
        runWranglerR2Command: function runWranglerPutCommand(args, stdio) {
          runWranglerR2Command(args, stdio, context);
        },
        logLabel: context.commandLabel,
        log: context.log,
      });
    },
    uploadManifestToR2: function uploadManifestToR2WithContext(targetBucketName, files) {
      uploadManifestToR2({
        bucketName: targetBucketName,
        files,
        manifestFileName: context.widgetR2ManifestFile,
        r2KeyPrefix: context.r2KeyPrefix,
        runWranglerR2Command: function runWranglerPutManifestCommand(args, stdio) {
          runWranglerR2Command(args, stdio, context);
        },
        writeFileSync: context.writeFileSync,
        mkdtempSync: context.mkdtempSync,
        rmSync: context.rmSync,
        now: context.now,
        logLabel: context.commandLabel,
        log: context.log,
      });
    },
    logLabel: context.commandLabel,
    log: context.log,
  });
}

function syncHistoricalWidgetBundlesForCi(context, builtFiles) {
  if (!isCiEnvironment(context.env)) {
    context.log(`[build:widget] 已跳过 R2 历史版本回填（非 CI 环境）`);
    return;
  }

  const bucketName = resolveBucketName({
    commandLabel: context.commandLabel,
    env: context.env,
    wranglerConfigFile: context.wranglerConfigFile,
    r2BindingName: context.r2BindingName,
    readFileSync: context.readFileSync,
  });

  syncWidgetBundlesFromR2({
    bucketName,
    builtFiles,
    readManifestFromR2: function readManifestFromR2WithContext(targetBucketName) {
      return readManifestFromR2({
        bucketName: targetBucketName,
        manifestFileName: context.widgetR2ManifestFile,
        r2KeyPrefix: context.r2KeyPrefix,
        runWranglerR2Command: function runWranglerGetCommand(args, stdio) {
          runWranglerR2Command(args, stdio, context);
        },
        readFileSync: context.readFileSync,
        mkdtempSync: context.mkdtempSync,
        rmSync: context.rmSync,
        now: context.now,
        logLabel: context.commandLabel,
        log: context.log,
      });
    },
    downloadManifestFilesFromR2: function downloadManifestFilesFromR2WithContext(
      targetBucketName,
      manifestFiles,
      files,
    ) {
      return downloadManifestFilesFromR2({
        bucketName: targetBucketName,
        manifestFiles,
        builtFiles: files,
        widgetOutputDir: context.widgetOutputDir,
        fileExists: context.existsSync,
        ensureOutputDir: function ensureOutputDir(outputDir) {
          context.mkdirSync(outputDir, { recursive: true });
        },
        toOutputPath: function toOutputPath(fileName) {
          return path.resolve(context.widgetOutputDir, fileName);
        },
        downloadFromR2: function downloadFromR2({ bucketName: currentBucketName, fileName, filePath }) {
          runWranglerR2Command(
            [
              "object",
              "get",
              toObjectPath(currentBucketName, fileName, context.r2KeyPrefix),
              "--file",
              filePath,
              "--remote",
            ],
            "inherit",
            context,
          );
        },
      });
    },
    logLabel: context.commandLabel,
    log: context.log,
  });
}

export function createBuildContext(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const env = options.env ?? process.env;

  return {
    cwd,
    env,
    commandLabel: options.commandLabel ?? "build:widget",
    log: options.log ?? console.log,
    now: options.now ?? defaultNow,
    execFileSync: options.execFileSync ?? execFileSync,
    readFileSync: options.readFileSync ?? readFileSync,
    readdirSync: options.readdirSync ?? readdirSync,
    existsSync: options.existsSync ?? existsSync,
    mkdirSync: options.mkdirSync ?? mkdirSync,
    mkdtempSync: options.mkdtempSync ?? mkdtempSync,
    writeFileSync: options.writeFileSync ?? writeFileSync,
    rmSync: options.rmSync ?? rmSync,
    widgetLocalesFile: path.resolve(cwd, "src/shared/supported-locales.ts"),
    wranglerConfigFile: path.resolve(cwd, "wrangler.jsonc"),
    widgetOutputDir: path.resolve(cwd, "dist/search-widget"),
    widgetR2ManifestFile: resolveManifestFileName(env),
    pnpmCmd: process.platform === "win32" ? "pnpm.cmd" : "pnpm",
    r2KeyPrefix: resolveR2KeyPrefix(env),
    r2BindingName: resolveR2BindingName(env),
  };
}

export function readWidgetLocalesFromFile(widgetLocalesFile, readFile = readFileSync) {
  const fileContent = readFile(widgetLocalesFile, "utf-8");
  return parseWidgetLocales(fileContent);
}

export function parseWidgetLocales(fileContent) {
  const matches = String(fileContent).matchAll(/"([a-z]{2}(?:-[a-z]{2})?)"/gi);
  const locales = Array.from(matches, function toLocale(match) {
    return match[1]?.toLowerCase();
  }).filter(Boolean);
  return Array.from(new Set(locales));
}

export function resolveBuildLocales(locales, targetLocale) {
  if (!targetLocale) {
    return locales;
  }

  if (!locales.includes(targetLocale)) {
    throw new Error(`[build:widget] 目标语言不存在: ${targetLocale}`);
  }

  return [targetLocale];
}

export function isCiEnvironment(env = process.env) {
  const ci = env.CI?.trim().toLowerCase();
  const githubActions = env.GITHUB_ACTIONS?.trim().toLowerCase();
  const cloudflarePages = env.CF_PAGES?.trim().toLowerCase();

  return ci === "true" || ci === "1" || githubActions === "true" || cloudflarePages === "1";
}

export function shouldBuildWidgetBundles(env = process.env) {
  return !isCiEnvironment(env);
}

export function resolveBucketName(options) {
  const { commandLabel = "build:widget", env, wranglerConfigFile, r2BindingName, readFileSync } = options;
  const envBucket = env.WIDGET_R2_BUCKET?.trim();
  if (envBucket) {
    return envBucket;
  }

  const config = readWranglerConfig(wranglerConfigFile, readFileSync, commandLabel);
  const r2Buckets = Array.isArray(config.r2_buckets) ? config.r2_buckets : [];
  const targetBucket = r2Buckets.find(function findBucket(item) {
    return item && typeof item === "object" && item.binding === r2BindingName;
  });

  if (!targetBucket || typeof targetBucket.bucket_name !== "string" || !targetBucket.bucket_name.trim()) {
    throw new Error(`[${commandLabel}] wrangler.jsonc 未找到 binding=${r2BindingName} 的 bucket_name`);
  }

  return targetBucket.bucket_name.trim();
}

export function readWranglerConfig(wranglerConfigFile, readFile = readFileSync, commandLabel = "build:widget") {
  const content = readFile(wranglerConfigFile, "utf-8");
  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`[${commandLabel}] 无法解析 wrangler.jsonc，请通过 WIDGET_R2_BUCKET 指定 bucket`, {
      cause: error,
    });
  }
}

export function collectBuiltWidgetFiles(widgetOutputDir, readDir = readdirSync) {
  const files = readDir(widgetOutputDir);
  return files
    .filter(function isWidgetBundle(fileName) {
      return isWidgetBundleFile(fileName);
    })
    .sort(function byFileName(left, right) {
      return left.localeCompare(right);
    });
}

function runViteBuild(context, locale, isFirstBuild) {
  context.execFileSync(context.pnpmCmd, ["exec", "vite", "build", "--config", "vite.widget.config.ts"], {
    stdio: "inherit",
    env: {
      ...context.env,
      WIDGET_BUILD_LOCALE: locale,
      WIDGET_EMPTY_OUT_DIR: isFirstBuild ? "1" : "0",
    },
  });
}

function runWranglerR2Command(args, stdio, context) {
  context.execFileSync(
    context.pnpmCmd,
    ["exec", "wrangler", "r2", ...args, "--config", path.basename(context.wranglerConfigFile)],
    {
      stdio,
      env: context.env,
    },
  );
}

function resolveManifestFileName(env) {
  return env.WIDGET_R2_MANIFEST_FILE?.trim() || DEFAULT_MANIFEST_FILE;
}

function resolveR2KeyPrefix(env) {
  return env.WIDGET_R2_PREFIX?.trim() || DEFAULT_R2_KEY_PREFIX;
}

function resolveR2BindingName(env) {
  return env.WIDGET_R2_BINDING?.trim() || DEFAULT_R2_BINDING_NAME;
}

function defaultNow() {
  return new Date();
}

export {
  createEmptyManifest,
  mergeManifestFiles,
  normalizeManifest,
  parseManifestSeedFiles,
  readErrorMessage,
  toManifestObjectPath,
} from "./build-widget-bundles-r2.mjs";

export {
  downloadManifestFilesFromR2,
  isWidgetBundleFile,
  publishWidgetBundles,
  readManifestFromR2,
  syncWidgetBundlesFromR2,
  toObjectPath,
  uploadManifestToR2,
  uploadWidgetBundlesToR2,
};
