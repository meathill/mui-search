const BLOCK_COMMENT_RE = /<!--.*?-->/gs;
const SCRIPT_STYLE_RE = /<(script|style|nav|footer|header)\b[^>]*>[\s\S]*?<\/\1>/gi;
const SHORTCODE_RE = /\[\/?\w+[^\]]*\]/g;

const HEADING_RE = /<h([2-3])\b[^>]*>([\s\S]*?)<\/h\1>/gi;
const BLOCK_TAG_RE = /<\/(p|div|li|blockquote|pre|tr|td|th|figcaption)>/gi;
const BR_RE = /<br\s*\/?>/gi;
const LIST_ITEM_RE = /<li\b[^>]*>/gi;
const ALL_TAGS_RE = /<[^>]+>/g;

const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#039;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
  "&ndash;": "–",
  "&mdash;": "—",
  "&hellip;": "…",
  "&lsquo;": "'",
  "&rsquo;": "'",
  "&ldquo;": "\u201C",
  "&rdquo;": "\u201D",
};

const NAMED_ENTITY_RE = /&(?:amp|lt|gt|quot|apos|nbsp|ndash|mdash|hellip|lsquo|rsquo|ldquo|rdquo|#039);/g;
const NUMERIC_ENTITY_RE = /&#(\d+);/g;
const HEX_ENTITY_RE = /&#x([0-9a-f]+);/gi;
const CONSECUTIVE_NEWLINES_RE = /\n{3,}/g;

/**
 * 将 WordPress HTML 内容转为纯文本，保留 H2/H3 标题标记以供分块使用。
 * 标题行以 `## ` 或 `### ` 前缀输出。
 */
export function htmlToText(html: string): string {
  let text = html;

  // 去除 HTML 注释（包括 Gutenberg 块注释）
  text = text.replace(BLOCK_COMMENT_RE, "");

  // 去除 script/style/nav 等非内容标签
  text = text.replace(SCRIPT_STYLE_RE, "");

  // 去除 WordPress 短代码
  text = text.replace(SHORTCODE_RE, "");

  // 将 H2/H3 标题转为 markdown 标记
  text = text.replace(HEADING_RE, function replaceHeading(_match, level, content) {
    const prefix = level === "2" ? "## " : "### ";
    const cleanContent = stripTags(content).trim();
    return `\n\n${prefix}${cleanContent}\n\n`;
  });

  // 块级标签闭合后换行
  text = text.replace(BLOCK_TAG_RE, "\n\n");

  // br 换行
  text = text.replace(BR_RE, "\n");

  // li 前加换行
  text = text.replace(LIST_ITEM_RE, "\n");

  // 去除所有剩余 HTML 标签
  text = text.replace(ALL_TAGS_RE, "");

  // 解码 HTML 实体
  text = decodeEntities(text);

  // 清理多余空白
  text = text.replace(CONSECUTIVE_NEWLINES_RE, "\n\n");
  text = text.trim();

  return text;
}

function stripTags(html: string): string {
  return html.replace(ALL_TAGS_RE, "");
}

function decodeEntities(text: string): string {
  let result = text.replace(NAMED_ENTITY_RE, function replaceNamedEntity(entity) {
    return HTML_ENTITIES[entity] ?? entity;
  });

  result = result.replace(NUMERIC_ENTITY_RE, function replaceNumericEntity(_match, code) {
    return String.fromCharCode(Number.parseInt(code, 10));
  });

  result = result.replace(HEX_ENTITY_RE, function replaceHexEntity(_match, hex) {
    return String.fromCharCode(Number.parseInt(hex, 16));
  });

  return result;
}
