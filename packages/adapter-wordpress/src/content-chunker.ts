import { htmlToText } from "./html-to-text";
import type { AdapterConfig, ContentChunk, WpPost } from "./types";

const HEADING_LINE_RE = /^(#{2,3})\s+(.+)$/;
const MAX_SLUG_LENGTH = 255;
const MAX_FRAGMENT_LENGTH = 50;
const READING_SPEED_CHARS_PER_MIN = 400;

interface Section {
  heading: string;
  level: number;
  lines: string[];
}

export function chunkPost(
  post: WpPost,
  config: Pick<AdapterConfig, "chunkMaxLength">,
  categoryMap?: Map<number, string>,
): ContentChunk[] {
  const plainText = htmlToText(post.content.rendered);
  if (!plainText) {
    return [];
  }

  const postTitle = htmlToText(post.title.rendered);
  const description = htmlToText(post.excerpt.rendered);
  const sourcePath = post.link;

  // post 级元数据：同一篇所有 chunk 共享
  const publishedAt = normalizePublishedAt(post.date);
  const categoryName = resolveCategoryName(post.categories, categoryMap);
  const readingTimeMinutes = Math.max(1, Math.ceil(plainText.length / READING_SPEED_CHARS_PER_MIN));

  const sections = splitIntoSections(plainText);

  // 短文章不分块
  if (sections.length === 1 && plainText.length <= config.chunkMaxLength) {
    return [
      {
        slug: post.slug,
        title: postTitle,
        description,
        content: plainText,
        sourcePath,
        publishedAt,
        categoryName,
        readingTimeMinutes,
      },
    ];
  }

  const chunks: ContentChunk[] = [];

  for (const section of sections) {
    const sectionContent = section.lines.join("\n").trim();
    if (!sectionContent) {
      continue;
    }

    const subChunks = splitByLength(sectionContent, config.chunkMaxLength);
    const baseSlug = section.heading ? buildFragmentSlug(post.slug, section.heading) : post.slug;

    for (let i = 0; i < subChunks.length; i++) {
      const chunkSlug = subChunks.length === 1 ? baseSlug : `${baseSlug}--${i + 1}`;
      const chunkTitle = section.heading ? `${postTitle} > ${section.heading}` : postTitle;

      chunks.push({
        slug: truncateSlug(chunkSlug),
        title: chunkTitle,
        description,
        content: subChunks[i]!,
        sourcePath,
        publishedAt,
        categoryName,
        readingTimeMinutes,
      });
    }
  }

  return chunks;
}

function normalizePublishedAt(date: string | undefined): string | null {
  if (!date) return null;
  // WP 返回的 "2024-01-01T12:34:56"（无时区，按站点时区），直接透传给 TiDB DATETIME
  return date;
}

function resolveCategoryName(
  categoryIds: number[] | undefined,
  categoryMap: Map<number, string> | undefined,
): string | null {
  if (!categoryIds?.length || !categoryMap) return null;
  const firstId = categoryIds[0];
  if (firstId == null) return null;
  return categoryMap.get(firstId) ?? null;
}

function splitIntoSections(text: string): Section[] {
  const lines = text.split("\n");
  const sections: Section[] = [];
  let current: Section = { heading: "", level: 0, lines: [] };

  for (const line of lines) {
    const match = HEADING_LINE_RE.exec(line);
    if (match) {
      // 保存前一个 section（如果有内容）
      if (current.lines.length > 0 || current.heading) {
        sections.push(current);
      }
      current = {
        heading: match[2]!.trim(),
        level: match[1]!.length,
        lines: [],
      };
    } else {
      current.lines.push(line);
    }
  }

  // 最后一个 section
  if (current.lines.length > 0 || current.heading) {
    sections.push(current);
  }

  return sections;
}

function splitByLength(text: string, maxLength: number): string[] {
  if (text.length <= maxLength) {
    return [text];
  }

  const paragraphs = text.split("\n\n");
  const chunks: string[] = [];
  let buffer = "";

  for (const paragraph of paragraphs) {
    const candidate = buffer ? `${buffer}\n\n${paragraph}` : paragraph;
    if (candidate.length > maxLength && buffer) {
      chunks.push(buffer.trim());
      buffer = paragraph;
    } else {
      buffer = candidate;
    }
  }

  if (buffer.trim()) {
    chunks.push(buffer.trim());
  }

  return chunks;
}

function buildFragmentSlug(postSlug: string, heading: string): string {
  const fragment = toKebabCase(heading).slice(0, MAX_FRAGMENT_LENGTH);
  return `${postSlug}#${fragment}`;
}

function toKebabCase(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function truncateSlug(slug: string): string {
  if (slug.length <= MAX_SLUG_LENGTH) {
    return slug;
  }

  const hashIndex = slug.indexOf("#");
  if (hashIndex === -1) {
    return slug.slice(0, MAX_SLUG_LENGTH);
  }

  // 保留 post slug 部分，截断 fragment
  const postSlug = slug.slice(0, hashIndex);
  const remaining = MAX_SLUG_LENGTH - postSlug.length - 1;
  if (remaining <= 0) {
    return postSlug.slice(0, MAX_SLUG_LENGTH);
  }

  return `${postSlug}#${slug.slice(hashIndex + 1, hashIndex + 1 + remaining)}`;
}
