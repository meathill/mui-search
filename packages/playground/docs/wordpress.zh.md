# WordPress 集成指南

将你的 WordPress 博客接入 MUI Search，获得全文检索 + 向量语义的混合搜索能力。

---

## 它能做什么？

`@mui-search/adapter-wordpress` 是一个命令行工具，它会：

1. 通过 WordPress REST API 拉取你的所有文章
2. 将长文章按标题自动分块，提升向量搜索精度
3. 写入 TiDB Cloud 数据库，自动生成向量嵌入
4. 支持全量同步和增量更新

同步完成后，你的博客内容就可以通过 MUI Search 的混合搜索 API 被检索到。

---

## 前置条件

开始之前，请确保你已经具备：

- **已部署的 MUI Search 实例** — Cloudflare Worker + TiDB Cloud（参考首页 Quick Start）
- **WordPress 站点** — 版本 4.7+，REST API 已启用（默认开启）
- **Node.js >= 24** 和 **pnpm** 已安装
- **HTTPS** — WordPress Application Password 要求站点启用 HTTPS

---

## 第 1 步：创建 WordPress 应用密码

Adapter 使用 [Application Passwords](https://make.wordpress.org/core/2020/11/05/application-passwords-integration-guide/) 进行身份验证，这是 WordPress 5.6+ 内置的安全认证方式。

### 1.1 登录 WordPress 后台

访问你的 WordPress 管理后台，通常是 `https://your-site.com/wp-admin`。

### 1.2 进入个人资料设置

导航到 **用户 → 我的个人资料**，向下滚动到 **「应用程序密码」** 部分。

> **找不到这个选项？** 可能的原因：
> - WordPress 版本低于 5.6 — 请升级
> - 站点未启用 HTTPS — Application Password 要求 HTTPS
> - 安全插件（如 iThemes Security）禁用了此功能 — 去插件设置中启用

### 1.3 创建新密码

1. 在「新增应用程序密码名称」输入框中填写名称，如 `MUI Search Sync`
2. 点击 **「添加新的应用程序密码」** 按钮
3. 系统会生成一个格式为 `xxxx xxxx xxxx xxxx xxxx xxxx` 的密码

### 1.4 保存密码

> **重要：** 这个密码只会显示一次！请立即复制并安全保存。

将用户名和应用密码记下来，下一步配置时需要用到。

---

## 第 2 步：配置环境变量

在项目根目录下的 `packages/adapter-wordpress/` 目录中创建 `.env` 文件：

```bash
# ============================
# WordPress 连接配置
# ============================
WP_SITE_URL=https://your-wordpress-site.com
WP_USERNAME=your-admin-username
WP_APP_PASSWORD=xxxx xxxx xxxx xxxx xxxx xxxx

# ============================
# TiDB 数据库连接
# ============================
TIDB_DATABASE_URL=mysql://user:password@gateway01.us-east-1.prod.aws.tidbcloud.com:4000/your_db?ssl=true

# ============================
# 可选配置（以下都有默认值）
# ============================
TIDB_TABLE_NAME=documents          # 目标表名，默认 documents
WP_LOCALE=zh                       # 内容语言代码，默认 zh
CHUNK_MAX_LENGTH=2000              # 分块最大字符数，默认 2000
WP_POSTS_PER_PAGE=50               # 每次 API 请求拉取文章数，默认 50
```

### 配置项说明

| 变量 | 必填 | 说明 |
|------|------|------|
| `WP_SITE_URL` | 是 | WordPress 站点地址，不含末尾斜杠 |
| `WP_USERNAME` | 是 | WordPress 管理员用户名 |
| `WP_APP_PASSWORD` | 是 | 第 1 步创建的应用密码 |
| `TIDB_DATABASE_URL` | 是 | TiDB Cloud Serverless 连接字符串 |
| `TIDB_TABLE_NAME` | 否 | 搜索数据存储的表名（默认 `documents`） |
| `WP_LOCALE` | 否 | 内容的语言代码（默认 `zh`） |
| `CHUNK_MAX_LENGTH` | 否 | 每个分块的最大字符数（默认 `2000`，范围 200–10000） |
| `WP_POSTS_PER_PAGE` | 否 | 每页拉取的文章数（默认 `50`，最大 100） |

---

## 第 3 步：同步内容

### 试运行（推荐首次使用）

先用 `--dry-run` 验证配置是否正确，不会写入数据库：

```bash
cd packages/adapter-wordpress
node --env-file=.env src/index.ts sync:full --dry-run
```

输出示例：

```
WordPress Adapter: sync:full
站点: https://your-site.com
目标表: documents
语言: zh
[dry-run 模式]
---
拉取完成: 42 篇文章，67 个分块
[dry-run] 跳过数据库写入
---
文章数: 42
分块数: 67
写入数: 0
删除数: 0
```

### 全量同步

拉取所有已发布文章并导入数据库。**首次使用时必须运行全量同步：**

```bash
node --env-file=.env src/index.ts sync:full
```

### 增量同步

仅拉取上次同步后修改过的文章，速度更快，适合日常更新：

```bash
node --env-file=.env src/index.ts sync
```

> **注意：** 增量同步无法检测已删除的文章。建议定期（如每周）运行一次全量同步来清理。

---

## 内容分块机制

为了提高向量搜索精度，长文章会被自动拆分成小块。每个块都会独立生成向量嵌入。

### 分块规则

1. **按 H2/H3 标题切分** — 文章首先按二级和三级标题拆分成段落
2. **超长段落二次切分** — 超过 `CHUNK_MAX_LENGTH`（默认 2000 字符）的段落会按段落边界进一步拆分
3. **短文章不切分** — 内容少于 `CHUNK_MAX_LENGTH` 且没有 H2 标题的文章保持整篇

### Slug 命名规则

每个分块都有独立的 slug，用于唯一标识：

```
post-slug              → 文章的第一个块或无标题文章
post-slug#section-title → 按标题分出的块
post-slug#section-title--2  → 同标题下的第2个子块
```

### 分块示例

假设一篇文章结构如下：

```markdown
# 文章标题（H1，不参与分块）

引言段落...

## 快速开始          → 块 1: slug = "my-post#快速开始"

这一节的内容...

## 高级配置          → 块 2: slug = "my-post#高级配置"

这一节的内容（如果很长，会进一步拆分为 my-post#高级配置--1, --2...）

## 常见问题          → 块 3: slug = "my-post#常见问题"

FAQ 内容...
```

---

## WP 兼容搜索 API

MUI Search Worker 提供了一个与 WordPress REST API 搜索格式兼容的端点，你可以用它直接替代 WordPress 内置搜索。

### 端点

```
GET /api/wp/v2/search
```

### 参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `search` | string | 搜索关键词（必填，至少 2 个字符） |
| `per_page` | number | 返回结果数量（默认 10） |
| `locale` | string | 按语言过滤（如 `zh`、`en`） |
| `subtype` | string | 内容类型（默认 `post`） |

### 请求示例

```bash
curl "https://your-worker.dev/api/wp/v2/search?search=hello+world&per_page=5"
```

### 响应示例

```json
[
  {
    "id": 42,
    "title": "Hello World: WordPress 入门指南",
    "url": "/hello-world",
    "type": "post",
    "subtype": "post"
  }
]
```

响应头包含分页信息：
- `X-WP-Total` — 结果总数
- `X-WP-TotalPages` — 总页数

---

## 在 WordPress 主题中集成

你可以在 WordPress 主题中将搜索请求指向 MUI Search，替代内置搜索。

### 方式一：使用搜索组件（推荐）

在主题的 `header.php` 或 `footer.php` 中添加 MUI Search Widget：

```html
<link rel="stylesheet"
  href="https://unpkg.com/@mui-search/search-widget/dist/search-widget.css">

<div
  data-mui-search
  data-api-base-url="https://your-worker.dev"
  data-locale="zh"
></div>

<script src="https://unpkg.com/@mui-search/search-widget/dist/search.zh.js"></script>
```

### 方式二：在 PHP 中调用 API

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

## 自动化同步

设置 cron 定时任务，自动保持搜索索引与博客内容同步。

### Linux/macOS cron

```bash
# 每天凌晨 3 点运行增量同步
0 3 * * * cd /path/to/mui-search/packages/adapter-wordpress && node --env-file=.env src/index.ts sync >> /var/log/mui-search-sync.log 2>&1

# 每周日凌晨 4 点运行全量同步（清理已删除文章）
0 4 * * 0 cd /path/to/mui-search/packages/adapter-wordpress && node --env-file=.env src/index.ts sync:full >> /var/log/mui-search-sync.log 2>&1
```

### GitHub Actions

```yaml
name: Sync WordPress to MUI Search
on:
  schedule:
    - cron: '0 3 * * *'  # 每天 UTC 3:00
  workflow_dispatch:       # 支持手动触发

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: node --env-file=.env src/index.ts sync
        working-directory: packages/adapter-wordpress
        env:
          WP_SITE_URL: ${{ secrets.WP_SITE_URL }}
          WP_USERNAME: ${{ secrets.WP_USERNAME }}
          WP_APP_PASSWORD: ${{ secrets.WP_APP_PASSWORD }}
          TIDB_DATABASE_URL: ${{ secrets.TIDB_DATABASE_URL }}
```

---

## 常见问题

### Q: REST API 返回 403 Forbidden？

**可能原因：**
- 安全插件（Wordfence、iThemes 等）屏蔽了 REST API
- 主机商的 WAF 规则拦截了请求
- `.htaccess` 中有限制规则

**解决方法：** 在安全插件中将 REST API 加入白名单，或联系主机商解除限制。

### Q: 同步速度很慢？

- TiDB 向量嵌入生成需要时间，每篇文章大约 1-3 秒
- 可以调小 `WP_POSTS_PER_PAGE` 来减少单次请求的负载
- 首次全量同步最慢，后续增量同步只处理变更的文章

### Q: 文章更新后搜索结果没有变化？

- 运行增量同步：`node --env-file=.env src/index.ts sync`
- 搜索结果可能被缓存（Worker Cache + KV，最长 7 天）
- 如果使用了 CDN，也需要等待 CDN 缓存过期

### Q: 如何只同步某个分类的文章？

目前 adapter 会同步所有已发布文章。如果你需要按分类过滤，可以考虑：
- 在 WordPress 中将不需要的文章设为"私密"状态
- 后续版本会增加分类/标签过滤功能

### Q: slug 长度超过 255 字符怎么办？

Adapter 会自动截断超长 slug。数据库的 `slug` 字段最大 255 字符，分块的 fragment 部分（`#` 后面）最多保留 50 字符。
