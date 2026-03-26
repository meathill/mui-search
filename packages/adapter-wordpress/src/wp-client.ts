import type { AdapterConfig, WpPost } from "./types";

const WP_API_FIELDS = "id,slug,title,content,excerpt,link,modified_gmt,status";

export async function* fetchAllPosts(
  config: Pick<AdapterConfig, "wpSiteUrl" | "wpUsername" | "wpAppPassword" | "postsPerPage">,
): AsyncGenerator<WpPost[]> {
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const url = buildPostsUrl(config.wpSiteUrl, {
      per_page: config.postsPerPage,
      page,
    });

    const { posts, total } = await fetchPage(url, config);
    totalPages = total;

    if (posts.length > 0) {
      yield posts;
    }

    page++;
  }
}

export async function* fetchPostsModifiedAfter(
  config: Pick<AdapterConfig, "wpSiteUrl" | "wpUsername" | "wpAppPassword" | "postsPerPage">,
  after: string,
): AsyncGenerator<WpPost[]> {
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const url = buildPostsUrl(config.wpSiteUrl, {
      per_page: config.postsPerPage,
      page,
      modified_after: after,
    });

    const { posts, total } = await fetchPage(url, config);
    totalPages = total;

    if (posts.length > 0) {
      yield posts;
    }

    page++;
  }
}

interface FetchPageResult {
  posts: WpPost[];
  total: number;
}

async function fetchPage(
  url: string,
  config: Pick<AdapterConfig, "wpUsername" | "wpAppPassword">,
): Promise<FetchPageResult> {
  const credentials = btoa(`${config.wpUsername}:${config.wpAppPassword}`);
  const response = await fetch(url, {
    headers: {
      Authorization: `Basic ${credentials}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`WP API 请求失败: ${response.status} ${response.statusText} — ${body}`);
  }

  const totalPages = Number.parseInt(response.headers.get("X-WP-TotalPages") ?? "1", 10);
  const posts = (await response.json()) as WpPost[];

  return { posts, total: totalPages };
}

function buildPostsUrl(
  siteUrl: string,
  params: {
    per_page: number;
    page: number;
    modified_after?: string;
  },
): string {
  const url = new URL(`${siteUrl}/wp-json/wp/v2/posts`);
  url.searchParams.set("per_page", String(params.per_page));
  url.searchParams.set("page", String(params.page));
  url.searchParams.set("status", "publish");
  url.searchParams.set("_fields", WP_API_FIELDS);
  url.searchParams.set("orderby", "modified");
  url.searchParams.set("order", "desc");

  if (params.modified_after) {
    url.searchParams.set("modified_after", params.modified_after);
  }

  return url.toString();
}
