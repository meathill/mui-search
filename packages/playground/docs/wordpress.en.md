# WordPress Integration Guide

Connect your WordPress blog to MUI Search for hybrid full-text + vector semantic search.

---

## What Does It Do?

MUI Search has built-in WordPress sync. Just configure a few environment variables and the Worker will:

1. **Automatically sync** your posts daily via the WordPress REST API
2. Chunk long articles by headings for better vector search accuracy
3. Write content into TiDB Cloud with auto-generated vector embeddings
4. Provide a WP-compatible search endpoint that can replace built-in WordPress search

**Zero manual work** — configure env vars at deploy time and sync starts automatically. You can also trigger sync manually via API or CLI.

---

## Prerequisites

Before you start, make sure you have:

- **A deployed MUI Search instance** — Cloudflare Worker + TiDB Cloud (see the homepage Quick Start)
- **A WordPress site** — version 4.7+, with REST API enabled (on by default)
- **HTTPS** — WordPress Application Passwords require HTTPS

---

## Step 1: Create a WordPress Application Password

The adapter uses [Application Passwords](https://make.wordpress.org/core/2020/11/05/application-passwords-integration-guide/) for authentication, a secure auth method built into WordPress 5.6+.

### 1.1 Log in to WordPress Admin

Go to your WordPress admin dashboard, usually at `https://your-site.com/wp-admin`.

### 1.2 Navigate to Profile Settings

Go to **Users → Profile**, scroll down to the **"Application Passwords"** section.

> **Can't find this option?** Possible reasons:
> - WordPress version is below 5.6 — please upgrade
> - HTTPS is not enabled — Application Passwords require HTTPS
> - A security plugin (e.g., iThemes Security) has disabled it — enable it in the plugin settings

### 1.3 Create a New Password

1. Enter a name in the "New Application Password Name" field, e.g., `MUI Search Sync`
2. Click **"Add New Application Password"**
3. The system will generate a password like `xxxx xxxx xxxx xxxx xxxx xxxx`

### 1.4 Save the Password

> **Important:** This password is only shown once! Copy and save it immediately.

Note down both your username and the application password for the next step.

---

## Step 2: Configure Environment Variables

### Option A: Via Wrangler (Recommended, Auto Sync)

Set WP credentials as Cloudflare Worker secrets:

```bash
cd packages/worker

# Set WordPress credentials (secret, won't appear in code)
wrangler secret put WP_USERNAME
wrangler secret put WP_APP_PASSWORD
```

Add non-sensitive config to `wrangler.jsonc` vars:

```jsonc
{
  "vars": {
    // ...existing config...
    "WP_SITE_URL": "https://your-wordpress-site.com",
    "WP_LOCALE": "en"
  }
}
```

After deploying, the Worker will **automatically run incremental sync daily at 2:30 AM UTC**.

### Option B: Via .env File (CLI Manual Sync)

Create a `.env` file in the `packages/adapter-wordpress/` directory:

```bash
# ============================
# WordPress Connection
# ============================
WP_SITE_URL=https://your-wordpress-site.com
WP_USERNAME=your-admin-username
WP_APP_PASSWORD=xxxx xxxx xxxx xxxx xxxx xxxx

# ============================
# TiDB Database Connection
# ============================
TIDB_DATABASE_URL=mysql://user:password@gateway01.us-east-1.prod.aws.tidbcloud.com:4000/your_db?ssl=true

# ============================
# Optional (all have defaults)
# ============================
TIDB_TABLE_NAME=documents          # Target table name, default: documents
WP_LOCALE=en                       # Content language code, default: zh
CHUNK_MAX_LENGTH=2000              # Max chars per chunk, default: 2000
WP_POSTS_PER_PAGE=50               # Posts per API request, default: 50
```

### Configuration Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `WP_SITE_URL` | Yes | WordPress site URL, no trailing slash |
| `WP_USERNAME` | Yes | WordPress admin username |
| `WP_APP_PASSWORD` | Yes | The Application Password from Step 1 |
| `TIDB_DATABASE_URL` | Yes | TiDB Cloud Serverless connection string |
| `TIDB_TABLE_NAME` | No | Table name for search data (default: `documents`) |
| `WP_LOCALE` | No | Language code for your content (default: `zh`) |
| `CHUNK_MAX_LENGTH` | No | Max characters per chunk (default: `2000`, range: 200–10000) |
| `WP_POSTS_PER_PAGE` | No | Posts fetched per API request (default: `50`, max: 100) |

---

## Step 3: Sync Your Content

If you used Option A (Wrangler config), sync runs automatically after deployment. You can also trigger it manually via API:

### Manual Trigger API

```bash
# Incremental sync
curl -X POST "https://your-worker.dev/api/wp-sync" \
  -H "X-API-Key: your-api-secret-key"

# Full sync
curl -X POST "https://your-worker.dev/api/wp-sync?mode=full" \
  -H "X-API-Key: your-api-secret-key"
```

> Requires `API_SECRET_KEY` environment variable to be set to protect this endpoint.

### CLI Manual Sync

If you used Option B (.env file), you can sync via CLI.

### Dry Run (Recommended for First Use)

Test your configuration with `--dry-run` — no data will be written:

```bash
cd packages/adapter-wordpress
node --env-file=.env src/index.ts sync:full --dry-run
```

Example output:

```
WordPress Adapter: sync:full
Site: https://your-site.com
Target table: documents
Locale: en
[dry-run mode]
---
Fetch complete: 42 posts, 67 chunks
[dry-run] Skipping database writes
---
Posts: 42
Chunks: 67
Upserted: 0
Deleted: 0
```

### Full Sync

Fetches all published posts and imports them. **You must run a full sync the first time:**

```bash
node --env-file=.env src/index.ts sync:full
```

### Incremental Sync

Only fetches posts modified since the last sync. Faster for routine updates:

```bash
node --env-file=.env src/index.ts sync
```

> **Note:** Incremental sync cannot detect deleted posts. Run a full sync periodically (e.g., weekly) to clean up.

---

## Content Chunking

To improve vector search accuracy, long articles are automatically split into smaller chunks. Each chunk gets its own vector embedding.

### Chunking Rules

1. **Split by H2/H3 headings** — Articles are first split at second and third-level headings
2. **Long sections get sub-split** — Sections exceeding `CHUNK_MAX_LENGTH` (default: 2000 chars) are further split at paragraph boundaries
3. **Short articles stay whole** — Articles shorter than `CHUNK_MAX_LENGTH` without H2 headings remain as a single chunk

### Slug Naming

Each chunk has a unique slug:

```
post-slug                    → First chunk or article without headings
post-slug#section-title      → Chunk split by heading
post-slug#section-title--2   → Second sub-chunk under same heading
```

### Chunking Example

Given an article structured like:

```markdown
# Article Title (H1, not used for splitting)

Introduction paragraph...

## Getting Started      → Chunk 1: slug = "my-post#getting-started"

Content for this section...

## Advanced Config      → Chunk 2: slug = "my-post#advanced-config"

Content (if too long, split into my-post#advanced-config--1, --2...)

## FAQ                  → Chunk 3: slug = "my-post#faq"

FAQ content...
```

---

## WP-Compatible Search API

MUI Search Worker exposes a WordPress REST API-compatible search endpoint, allowing you to drop-in replace WordPress built-in search.

### Endpoint

```
GET /api/wp/v2/search
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `search` | string | Search query (required, min 2 characters) |
| `per_page` | number | Number of results (default: 10) |
| `locale` | string | Filter by language (e.g., `zh`, `en`) |
| `subtype` | string | Content type (default: `post`) |

### Example Request

```bash
curl "https://your-worker.dev/api/wp/v2/search?search=hello+world&per_page=5"
```

### Example Response

```json
[
  {
    "id": 42,
    "title": "Hello World: Getting Started with WordPress",
    "url": "/hello-world",
    "type": "post",
    "subtype": "post"
  }
]
```

Response headers include pagination info:
- `X-WP-Total` — Total number of results
- `X-WP-TotalPages` — Total number of pages

---

## WordPress Theme Integration

You can point your WordPress theme's search to MUI Search, replacing the built-in search.

### Option 1: Use the Search Widget (Recommended)

Add the MUI Search Widget to your theme's `header.php` or `footer.php`:

```html
<link rel="stylesheet"
  href="https://unpkg.com/@mui-search/search-widget/dist/search-widget.css">

<div
  data-mui-search
  data-api-base-url="https://your-worker.dev"
  data-locale="en"
></div>

<script src="https://unpkg.com/@mui-search/search-widget/dist/search.en.js"></script>
```

### Option 2: Call the API from PHP

```php
// functions.php
function mui_search_results($query, $per_page = 10) {
    $api_url = 'https://your-worker.dev/api/wp/v2/search';
    $url = add_query_arg([
        'search'   => urlencode($query),
        'per_page' => $per_page,
    ], $api_url);

    $response = wp_remote_get($url);
    if (is_wp_error($response)) {
        return [];
    }

    return json_decode(wp_remote_retrieve_body($response), true);
}
```

---

---

## FAQ

### Q: REST API returns 403 Forbidden?

**Possible causes:**
- A security plugin (Wordfence, iThemes, etc.) is blocking the REST API
- Your hosting provider's WAF rules are intercepting requests
- `.htaccess` contains restrictive rules

**Fix:** Whitelist the REST API in your security plugin, or contact your hosting provider.

### Q: Sync is very slow?

- TiDB vector embedding generation takes time, roughly 1–3 seconds per article
- Try reducing `WP_POSTS_PER_PAGE` to lower the load per request
- The first full sync is always the slowest; subsequent incremental syncs only process changed articles

### Q: Search results don't update after editing a post?

- Run an incremental sync: `node --env-file=.env src/index.ts sync`
- Search results may be cached (Worker Cache + KV, up to 7 days)
- If you're using a CDN, wait for the CDN cache to expire

### Q: How do I sync only certain categories?

The adapter currently syncs all published posts. To filter by category:
- Set unwanted posts to "Private" status in WordPress
- Category/tag filtering will be added in a future version

### Q: Slug exceeds 255 characters?

The adapter automatically truncates long slugs. The database `slug` field allows up to 255 characters. The fragment part (after `#`) is limited to 50 characters.
