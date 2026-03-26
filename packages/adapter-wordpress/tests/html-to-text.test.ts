import { describe, expect, it } from "vitest";
import { htmlToText } from "../src/html-to-text";

describe("htmlToText", () => {
  it("去除基本 HTML 标签，保留文本", () => {
    const html = "<p>Hello <strong>world</strong></p>";
    expect(htmlToText(html)).toBe("Hello world");
  });

  it("将 H2 标题转为 ## 标记", () => {
    const html = "<h2>标题</h2><p>内容</p>";
    const result = htmlToText(html);
    expect(result).toContain("## 标题");
    expect(result).toContain("内容");
  });

  it("将 H3 标题转为 ### 标记", () => {
    const html = "<h3>子标题</h3><p>段落</p>";
    const result = htmlToText(html);
    expect(result).toContain("### 子标题");
  });

  it("去除标题标签内的 HTML", () => {
    const html = '<h2><a href="/x">带链接标题</a></h2>';
    expect(htmlToText(html)).toContain("## 带链接标题");
  });

  it("去除 script 和 style 标签及内容", () => {
    const html = "<p>前</p><script>alert(1)</script><style>.a{color:red}</style><p>后</p>";
    const result = htmlToText(html);
    expect(result).not.toContain("alert");
    expect(result).not.toContain("color");
    expect(result).toContain("前");
    expect(result).toContain("后");
  });

  it("去除 WordPress Gutenberg 块注释", () => {
    const html = "<!-- wp:paragraph --><p>正文</p><!-- /wp:paragraph -->";
    expect(htmlToText(html)).toBe("正文");
  });

  it("去除短代码", () => {
    const html = '<p>开始 [gallery ids="1,2,3"] 结束</p>';
    expect(htmlToText(html)).toBe("开始  结束");
  });

  it("解码 HTML 实体", () => {
    const html = "<p>A &amp; B &lt; C &gt; D &quot;E&quot; &#039;F&#039;</p>";
    expect(htmlToText(html)).toBe("A & B < C > D \"E\" 'F'");
  });

  it("解码数字和十六进制实体", () => {
    const html = "<p>&#169; &#x2603;</p>";
    expect(htmlToText(html)).toBe("© ☃");
  });

  it("将 br 转换为换行", () => {
    const html = "<p>行一<br/>行二<br>行三</p>";
    const result = htmlToText(html);
    expect(result).toContain("行一\n行二\n行三");
  });

  it("块级标签产生段落分隔", () => {
    const html = "<p>段落一</p><p>段落二</p>";
    const result = htmlToText(html);
    expect(result).toContain("段落一\n\n段落二");
  });

  it("合并超过两个的连续换行", () => {
    const html = "<p>A</p>\n\n\n\n<p>B</p>";
    const result = htmlToText(html);
    expect(result).not.toContain("\n\n\n");
  });

  it("去除 nav/footer/header 标签及内容", () => {
    const html = '<nav><a href="/">首页</a></nav><p>正文</p><footer>底部</footer>';
    const result = htmlToText(html);
    expect(result).toBe("正文");
  });

  it("处理空输入", () => {
    expect(htmlToText("")).toBe("");
  });
});
