export interface LandingTranslations {
  nav: {
    playground: string;
    analytics: string;
    widgetDemo: string;
    github: string;
    switchLang: string;
  };
  hero: {
    badge: string;
    title: string;
    subtitle: string;
    ctaStart: string;
    ctaPlayground: string;
  };
  features: {
    title: string;
    subtitle: string;
    items: Array<{
      icon: string;
      title: string;
      desc: string;
    }>;
  };
  architecture: {
    title: string;
    subtitle: string;
    steps: string[];
  };
  quickStart: {
    title: string;
    subtitle: string;
    steps: Array<{
      label: string;
      title: string;
      code: string;
    }>;
  };
  footer: {
    license: string;
    builtWith: string;
  };
}

const en: LandingTranslations = {
  nav: {
    playground: "Playground",
    analytics: "Analytics",
    widgetDemo: "Widget Demo",
    github: "GitHub",
    switchLang: "\u4e2d\u6587",
  },
  hero: {
    badge: "Open Source \u00b7 MIT License",
    title: "MUI Search",
    subtitle:
      "An open-source hybrid search engine powered by Cloudflare Workers and TiDB Cloud. Combines full-text and vector semantic search with Reciprocal Rank Fusion for best-in-class relevance.",
    ctaStart: "Get Started",
    ctaPlayground: "Try Playground",
  },
  features: {
    title: "Core Features",
    subtitle: "Everything you need for a production-grade search experience",
    items: [
      {
        icon: "\u{1f50d}",
        title: "Hybrid Search",
        desc: "Full-text keyword search + vector semantic matching, merged with Reciprocal Rank Fusion (RRF) for superior relevance.",
      },
      {
        icon: "\u26a1",
        title: "Edge Computing",
        desc: "Runs on Cloudflare Workers with smart placement. Low latency globally, no cold starts, infinite scalability.",
      },
      {
        icon: "\u{1f4be}",
        title: "Multi-Layer Caching",
        desc: "Worker Cache API + KV store delivers millisecond responses. 7-day data cache with automatic invalidation.",
      },
      {
        icon: "\u{1f9e9}",
        title: "Embeddable Widget",
        desc: "A Preact-powered IIFE widget. Drop one script tag, add a data attribute, and you have search.",
      },
      {
        icon: "\u{1f30d}",
        title: "38 Languages",
        desc: "Fully localized search widget with per-locale bundles. Auto-detects language or set it explicitly.",
      },
      {
        icon: "\u{1f4ca}",
        title: "Search Analytics",
        desc: "Built-in trending queries, hot content tracking, and day/week/month segmented statistics.",
      },
    ],
  },
  architecture: {
    title: "How It Works",
    subtitle: "From query to results in milliseconds",
    steps: [
      "User types a query in the Search Widget",
      "Request hits Cloudflare Worker at the edge",
      "Worker runs full-text and vector search in parallel on TiDB",
      "Results are merged using Reciprocal Rank Fusion",
      "Response is cached across Worker Cache + KV",
      "Ranked results are returned to the user",
    ],
  },
  quickStart: {
    title: "Quick Start",
    subtitle: "Up and running in 3 steps",
    steps: [
      {
        label: "Step 1",
        title: "Clone & Deploy",
        code: `git clone https://github.com/meathill/mui-search.git
cd mui-search
pnpm install

# Configure wrangler.jsonc with your IDs
cd packages/worker
pnpm run deploy`,
      },
      {
        label: "Step 2",
        title: "Import Data",
        code: `# Prepare your documents as JSON
cat > data.json << 'EOF'
[
  {
    "slug": "getting-started",
    "locale": "en",
    "title": "Getting Started",
    "content": "Full text content..."
  }
]
EOF

# Import via API
curl -X POST https://your-worker.dev/api/documents \\
  -H "Authorization: Bearer YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d @data.json`,
      },
      {
        label: "Step 3",
        title: "Embed Widget",
        code: `<!-- Add to your HTML -->
<div
  data-mui-search
  data-api-base-url="https://your-worker.dev"
  data-locale="en"
></div>

<script src="https://unpkg.com/@mui-search/search-widget/dist/search.en.js"></script>`,
      },
    ],
  },
  footer: {
    license: "Released under the MIT License.",
    builtWith: "Built with Cloudflare Workers, TiDB Cloud, Hono, Preact, and React.",
  },
};

const zh: LandingTranslations = {
  nav: {
    playground: "\u6d4b\u8bd5\u53f0",
    analytics: "\u6570\u636e\u7edf\u8ba1",
    widgetDemo: "\u7ec4\u4ef6\u6f14\u793a",
    github: "GitHub",
    switchLang: "EN",
  },
  hero: {
    badge: "\u5f00\u6e90 \u00b7 MIT \u534f\u8bae",
    title: "MUI Search",
    subtitle:
      "\u57fa\u4e8e Cloudflare Workers \u548c TiDB Cloud \u7684\u5f00\u6e90\u6df7\u5408\u641c\u7d22\u5f15\u64ce\u3002\u5168\u6587\u68c0\u7d22 + \u5411\u91cf\u8bed\u4e49\u641c\u7d22\uff0c\u901a\u8fc7 RRF \u878d\u5408\u6392\u5e8f\u5b9e\u73b0\u6781\u81f4\u76f8\u5173\u6027\u3002",
    ctaStart: "\u5feb\u901f\u5f00\u59cb",
    ctaPlayground: "\u5728\u7ebf\u4f53\u9a8c",
  },
  features: {
    title: "\u6838\u5fc3\u7279\u6027",
    subtitle: "\u751f\u4ea7\u7ea7\u641c\u7d22\u4f53\u9a8c\u6240\u9700\u7684\u4e00\u5207",
    items: [
      {
        icon: "\u{1f50d}",
        title: "\u6df7\u5408\u641c\u7d22",
        desc: "\u5168\u6587\u5173\u952e\u8bcd\u641c\u7d22 + \u5411\u91cf\u8bed\u4e49\u5339\u914d\uff0c\u901a\u8fc7 RRF\uff08\u5012\u6570\u6392\u540d\u878d\u5408\uff09\u7b97\u6cd5\u5b9e\u73b0\u66f4\u7cbe\u51c6\u7684\u641c\u7d22\u7ed3\u679c\u3002",
      },
      {
        icon: "\u26a1",
        title: "\u8fb9\u7f18\u8ba1\u7b97",
        desc: "\u8fd0\u884c\u5728 Cloudflare Workers \u4e0a\uff0c\u667a\u80fd\u5c31\u8fd1\u90e8\u7f72\u3002\u5168\u7403\u4f4e\u5ef6\u8fdf\uff0c\u65e0\u51b7\u542f\u52a8\uff0c\u65e0\u9650\u5f39\u6027\u4f38\u7f29\u3002",
      },
      {
        icon: "\u{1f4be}",
        title: "\u591a\u5c42\u7f13\u5b58",
        desc: "Worker Cache API + KV \u5b58\u50a8\u53cc\u5c42\u7f13\u5b58\uff0c\u6beb\u79d2\u7ea7\u54cd\u5e94\u30027 \u5929\u6570\u636e\u7f13\u5b58\uff0c\u81ea\u52a8\u5931\u6548\u3002",
      },
      {
        icon: "\u{1f9e9}",
        title: "\u5d4c\u5165\u5f0f\u7ec4\u4ef6",
        desc: "\u57fa\u4e8e Preact \u7684 IIFE \u641c\u7d22\u7ec4\u4ef6\u3002\u4e00\u884c\u4ee3\u7801\u63a5\u5165\uff0c\u52a0\u4e00\u4e2a data \u5c5e\u6027\u5373\u53ef\u4f7f\u7528\u3002",
      },
      {
        icon: "\u{1f30d}",
        title: "38 \u79cd\u8bed\u8a00",
        desc: "\u5b8c\u5168\u672c\u5730\u5316\u7684\u641c\u7d22\u7ec4\u4ef6\uff0c\u6309\u8bed\u8a00\u6253\u5305\u3002\u81ea\u52a8\u8bc6\u522b\u8bed\u8a00\u6216\u624b\u52a8\u6307\u5b9a\u3002",
      },
      {
        icon: "\u{1f4ca}",
        title: "\u641c\u7d22\u5206\u6790",
        desc: "\u5185\u7f6e\u70ed\u95e8\u67e5\u8be2\u3001\u70ed\u95e8\u5185\u5bb9\u8ffd\u8e2a\uff0c\u652f\u6301\u6309\u5929/\u5468/\u6708\u7684\u5206\u6bb5\u7edf\u8ba1\u3002",
      },
    ],
  },
  architecture: {
    title: "\u5de5\u4f5c\u539f\u7406",
    subtitle: "\u4ece\u67e5\u8be2\u5230\u7ed3\u679c\uff0c\u6beb\u79d2\u7ea7\u54cd\u5e94",
    steps: [
      "\u7528\u6237\u5728\u641c\u7d22\u7ec4\u4ef6\u4e2d\u8f93\u5165\u67e5\u8be2",
      "\u8bf7\u6c42\u5230\u8fbe\u8fb9\u7f18\u8282\u70b9\u7684 Cloudflare Worker",
      "Worker \u5e76\u884c\u6267\u884c\u5168\u6587\u641c\u7d22\u548c\u5411\u91cf\u641c\u7d22\uff08TiDB\uff09",
      "\u901a\u8fc7 RRF \u7b97\u6cd5\u878d\u5408\u6392\u5e8f\u7ed3\u679c",
      "\u54cd\u5e94\u7ecf Worker Cache + KV \u53cc\u5c42\u7f13\u5b58",
      "\u6392\u5e8f\u7ed3\u679c\u8fd4\u56de\u7ed9\u7528\u6237",
    ],
  },
  quickStart: {
    title: "\u5feb\u901f\u5f00\u59cb",
    subtitle: "3 \u6b65\u5373\u53ef\u4e0a\u624b",
    steps: [
      {
        label: "\u7b2c 1 \u6b65",
        title: "\u514b\u9686\u4e0e\u90e8\u7f72",
        code: `git clone https://github.com/meathill/mui-search.git
cd mui-search
pnpm install

# \u5728 wrangler.jsonc \u4e2d\u914d\u7f6e\u4f60\u7684 ID
cd packages/worker
pnpm run deploy`,
      },
      {
        label: "\u7b2c 2 \u6b65",
        title: "\u5bfc\u5165\u6570\u636e",
        code: `# \u51c6\u5907 JSON \u683c\u5f0f\u7684\u6587\u6863\u6570\u636e
cat > data.json << 'EOF'
[
  {
    "slug": "getting-started",
    "locale": "zh",
    "title": "\u5feb\u901f\u5f00\u59cb",
    "content": "\u5b8c\u6574\u6587\u672c\u5185\u5bb9..."
  }
]
EOF

# \u901a\u8fc7 API \u5bfc\u5165
curl -X POST https://your-worker.dev/api/documents \\
  -H "Authorization: Bearer YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d @data.json`,
      },
      {
        label: "\u7b2c 3 \u6b65",
        title: "\u5d4c\u5165\u7ec4\u4ef6",
        code: `<!-- \u6dfb\u52a0\u5230\u4f60\u7684 HTML -->
<div
  data-mui-search
  data-api-base-url="https://your-worker.dev"
  data-locale="zh"
></div>

<script src="https://unpkg.com/@mui-search/search-widget/dist/search.zh.js"></script>`,
      },
    ],
  },
  footer: {
    license: "\u57fa\u4e8e MIT \u534f\u8bae\u5f00\u6e90\u3002",
    builtWith: "\u57fa\u4e8e Cloudflare Workers\u3001TiDB Cloud\u3001Hono\u3001Preact \u548c React \u6784\u5efa\u3002",
  },
};

export const translations: Record<string, LandingTranslations> = { en, zh };
