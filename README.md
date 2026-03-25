# MUI Search

An open-source hybrid search engine powered by **Cloudflare Workers** and **TiDB Cloud**.

Combines full-text keyword search with vector semantic matching, merged using Reciprocal Rank Fusion (RRF) for best-in-class relevance. Deployed at the edge with multi-layer caching for millisecond responses.

## Features

- **Hybrid Search** — Full-text + vector semantic search, fused with RRF ranking
- **Edge Computing** — Runs on Cloudflare Workers with smart placement, globally low latency
- **Multi-Layer Caching** — Worker Cache API + KV store, 7-day data cache
- **Embeddable Widget** — Preact IIFE widget, one `data-mui-search` attribute to integrate
- **38 Languages** — Per-locale widget bundles, auto-detect or explicit
- **Search Analytics** — Hot queries, content trends, day/week/month segmented stats
- **Suggest & Autocomplete** — Real-time title suggestions as you type
- **Click Tracking** — Record user behavior for ranking optimization

## Architecture

```
User → Search Widget (Preact IIFE)
         ↓
   Cloudflare Worker (Hono)
     ├── Worker Cache API (response cache)
     ├── KV (data cache, 7-day TTL)
     └── TiDB Cloud Serverless
           ├── Full-Text Search (FTS index)
           └── Vector Search (auto-embedding)
                  ↓
           RRF Fusion → Ranked Results
```

## Monorepo Structure

```
packages/
├── shared/          # @mui-search/shared — TypeScript types & utilities
├── worker/          # @mui-search/worker — Cloudflare Workers API
├── search-widget/   # @mui-search/search-widget — Preact IIFE widget
└── playground/      # @mui-search/playground — Landing page & dev tools
```

## Quick Start

### Prerequisites

- Node.js >= 24
- [pnpm](https://pnpm.io/)
- A [Cloudflare](https://dash.cloudflare.com/) account
- A [TiDB Cloud Serverless](https://tidbcloud.com/) cluster

### 1. Clone & Install

```bash
git clone https://github.com/meathill/mui-search.git
cd mui-search
pnpm install
```

### 2. Configure Worker

```bash
cd packages/worker

# Copy the example config
cp wrangler.example.jsonc wrangler.jsonc
```

Create Cloudflare resources and fill in the IDs:

```bash
# Create D1 database
wrangler d1 create mui-search
# → Copy database_id into wrangler.jsonc

# Create KV namespace
wrangler kv namespace create KV
# → Copy id into wrangler.jsonc
```

Set TiDB connection string as a secret:

```bash
wrangler secret put TIDB_DATABASE_URL
# Paste: mysql://user:password@host:port/database
```

### 3. Initialize Databases

```bash
# Apply D1 schema migrations
pnpm run db:d1:migrate:remote

# Apply TiDB schema migrations
pnpm run db:migrate
```

### 4. Import Data

Prepare a JSON file with your documents:

```json
[
  {
    "slug": "getting-started",
    "locale": "en",
    "title": "Getting Started",
    "description": "How to get started",
    "content": "Full text content for search indexing..."
  }
]
```

Import via the API:

```bash
curl -X POST https://your-worker.dev/api/documents \
  -H "Authorization: Bearer YOUR_API_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d @data.json
```

### 5. Deploy

```bash
pnpm run deploy
```

This builds the playground static site and deploys everything (Worker + static assets) to Cloudflare.

### 6. Embed the Widget

```html
<!-- Include the CSS -->
<link rel="stylesheet" href="https://unpkg.com/@mui-search/search-widget/dist/search-widget.css">

<!-- Add a mount point -->
<div
  data-mui-search
  data-api-base-url="https://your-worker.your-domain.workers.dev"
  data-locale="en"
></div>

<!-- Include the JS -->
<script src="https://unpkg.com/@mui-search/search-widget/dist/search.en.js"></script>
```

Or mount programmatically:

```javascript
window.MuiSearchWidget.mount({
  mount: '#search-container',
  apiBaseUrl: 'https://your-worker.your-domain.workers.dev',
  locale: 'en',
});
```

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/suggest` | GET | Autocomplete suggestions |
| `/api/search` | GET | Hybrid search (full-text + vector) |
| `/api/click` | POST | Record click events |
| `/api/hot` | GET | Hot content (from external source) |
| `/api/hot-queries` | GET | Trending search queries |
| `/api/stats/daily-search` | GET | Daily search statistics |
| `/api/stats/segmented-top` | GET | Day/week/month top queries & content |
| `/api/stats/content-queries` | GET | Reverse lookup: content → queries |
| `/api/health` | GET | Health check |

## Development

```bash
# Start playground dev server
pnpm --filter @mui-search/playground dev

# Run all tests
pnpm test

# Format code
pnpm run format

# Type check
pnpm run typecheck
```

## Tech Stack

- [Cloudflare Workers](https://workers.cloudflare.com/) — Edge runtime
- [TiDB Cloud Serverless](https://tidbcloud.com/) — MySQL-compatible database with vector search & auto-embedding
- [Hono](https://hono.dev/) — Lightweight web framework
- [Preact](https://preactjs.com/) — Widget UI (3KB)
- [React](https://react.dev/) — Playground & landing page
- [Drizzle ORM](https://orm.drizzle.team/) — TiDB schema management
- [Vite](https://vite.dev/) — Build tool
- [Vitest](https://vitest.dev/) — Testing framework
- [Biome](https://biomejs.dev/) — Formatter & linter
- [Tailwind CSS](https://tailwindcss.com/) — Styling

## License

[MIT](LICENSE)
