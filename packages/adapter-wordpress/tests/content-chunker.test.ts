import { describe, expect, it } from "vitest";
import { chunkPost } from "../src/content-chunker";
import type { WpPost } from "../src/types";

function makePost(overrides: Partial<WpPost> = {}): WpPost {
  return {
    id: 1,
    slug: "test-post",
    title: { rendered: "测试文章" },
    content: { rendered: "<p>这是内容</p>" },
    excerpt: { rendered: "<p>摘要</p>" },
    link: "https://blog.example.com/test-post",
    modified_gmt: "2024-01-01T00:00:00",
    status: "publish",
    ...overrides,
  };
}

describe("chunkPost", () => {
  const config = { chunkMaxLength: 2000 };

  it("短文章不分块", () => {
    const post = makePost();
    const chunks = chunkPost(post, config);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]!.slug).toBe("test-post");
    expect(chunks[0]!.title).toBe("测试文章");
    expect(chunks[0]!.content).toBe("这是内容");
    expect(chunks[0]!.description).toBe("摘要");
    expect(chunks[0]!.sourcePath).toBe("https://blog.example.com/test-post");
  });

  it("按 H2 标题分块", () => {
    const post = makePost({
      content: {
        rendered: `
          <p>引言内容</p>
          <h2>第一章</h2>
          <p>第一章内容</p>
          <h2>第二章</h2>
          <p>第二章内容</p>
        `,
      },
    });
    const chunks = chunkPost(post, config);
    expect(chunks.length).toBeGreaterThanOrEqual(3);

    // 第一个 chunk 是引言
    expect(chunks[0]!.slug).toBe("test-post");
    expect(chunks[0]!.title).toBe("测试文章");
    expect(chunks[0]!.content).toContain("引言内容");

    // 第二个 chunk 是第一章
    expect(chunks[1]!.slug).toContain("test-post#");
    expect(chunks[1]!.title).toBe("测试文章 > 第一章");
    expect(chunks[1]!.content).toContain("第一章内容");

    // 第三个 chunk 是第二章
    expect(chunks[2]!.slug).toContain("test-post#");
    expect(chunks[2]!.title).toBe("测试文章 > 第二章");
    expect(chunks[2]!.content).toContain("第二章内容");
  });

  it("超长段落二次切分并编号", () => {
    const longParagraph = "A".repeat(1500);
    const post = makePost({
      content: {
        rendered: `<h2>长章节</h2><p>${longParagraph}</p><p>${longParagraph}</p>`,
      },
    });
    const chunks = chunkPost(post, { chunkMaxLength: 2000 });
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    // 编号后缀
    expect(chunks[0]!.slug).toMatch(/--1$/);
    expect(chunks[1]!.slug).toMatch(/--2$/);
  });

  it("空内容返回空数组", () => {
    const post = makePost({ content: { rendered: "" } });
    expect(chunkPost(post, config)).toHaveLength(0);
  });

  it("无标题文章整篇作为一个 chunk", () => {
    const post = makePost({
      content: { rendered: "<p>纯文本内容，没有标题</p>" },
    });
    const chunks = chunkPost(post, config);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]!.slug).toBe("test-post");
  });

  it("slug 总长不超过 255 字符", () => {
    const longSlug = "a".repeat(200);
    const post = makePost({
      slug: longSlug,
      content: {
        rendered: `<h2>${"长标题".repeat(30)}</h2><p>内容</p>`,
      },
    });
    const chunks = chunkPost(post, config);
    for (const chunk of chunks) {
      expect(chunk.slug.length).toBeLessThanOrEqual(255);
    }
  });

  it("标题中的特殊字符转为 kebab-case", () => {
    const post = makePost({
      content: {
        rendered: "<p>引言</p><h2>Hello World! 你好世界</h2><p>内容</p>",
      },
    });
    const chunks = chunkPost(post, config);
    const sectionChunk = chunks.find((c) => c.slug.includes("#"));
    expect(sectionChunk).toBeDefined();
    expect(sectionChunk!.slug).toMatch(/^test-post#[a-z0-9\u4e00-\u9fff-]+$/u);
  });

  it("H3 标题也作为分块边界", () => {
    const post = makePost({
      content: {
        rendered: `
          <p>引言</p>
          <h3>小节一</h3>
          <p>小节一内容</p>
          <h3>小节二</h3>
          <p>小节二内容</p>
        `,
      },
    });
    const chunks = chunkPost(post, config);
    expect(chunks.length).toBeGreaterThanOrEqual(3);
  });

  it("所有 chunk 共享相同的 description 和 sourcePath", () => {
    const post = makePost({
      content: {
        rendered: "<h2>A</h2><p>aaa</p><h2>B</h2><p>bbb</p>",
      },
    });
    const chunks = chunkPost(post, config);
    for (const chunk of chunks) {
      expect(chunk.description).toBe("摘要");
      expect(chunk.sourcePath).toBe("https://blog.example.com/test-post");
    }
  });

  it("透传 publishedAt / categoryName / readingTimeMinutes 到所有 chunk", () => {
    const post = makePost({
      date: "2024-06-01T12:00:00",
      categories: [12, 34],
      content: { rendered: "<h2>A</h2><p>aaa</p><h2>B</h2><p>bbb</p>" },
    });
    const categoryMap = new Map<number, string>([
      [12, "前端"],
      [34, "杂谈"],
    ]);
    const chunks = chunkPost(post, config, categoryMap);
    expect(chunks.length).toBeGreaterThan(0);
    for (const chunk of chunks) {
      expect(chunk.publishedAt).toBe("2024-06-01T12:00:00");
      expect(chunk.categoryName).toBe("前端");
      expect(chunk.readingTimeMinutes).toBeGreaterThanOrEqual(1);
    }
  });

  it("没有 date / categoryMap 时返回 null", () => {
    const post = makePost();
    const chunks = chunkPost(post, config);
    expect(chunks[0]!.publishedAt).toBeNull();
    expect(chunks[0]!.categoryName).toBeNull();
    expect(chunks[0]!.readingTimeMinutes).toBeGreaterThanOrEqual(1);
  });
});
