import { describe, expect, it } from "vitest";

import { getTranslations, translations } from "../src/locales";
import { WIDGET_LOCALES } from "../src/widget-locales";

describe("search-widget locales", () => {
  it("cn 应返回简体中文文案", () => {
    const t = getTranslations("cn");
    expect(t.placeholder).toBe("请输入关键词");
  });

  it("zh-hk 应返回繁体中文文案", () => {
    const t = getTranslations("zh-hk");
    expect(t.placeholder).toBe("請輸入關鍵字");
  });

  it("en-us 应返回英文文案", () => {
    const t = getTranslations("en-us");
    expect(t.placeholder).toBe("Type to search...");
  });

  it("fr 应返回法语文案", () => {
    const t = getTranslations("fr");
    expect(t.placeholder).toBe("Tapez pour rechercher...");
  });

  it("fr-ca 应命中 fr 语言包而不是英文", () => {
    const t = getTranslations("fr-ca");
    expect(t.placeholder).toBe("Tapez pour rechercher...");
  });

  it("all 应回退到英文文案作为默认语言", () => {
    const t = getTranslations("all");
    expect(t.placeholder).toBe("Type to search...");
  });

  it("未知语言应回退到英文文案", () => {
    const t = getTranslations("xx");
    expect(t.placeholder).toBe("Type to search...");
  });

  it("静态语言清单中的每个语言都必须有可用翻译", () => {
    for (const locale of WIDGET_LOCALES) {
      const t = translations[locale];
      expect(t).toBeDefined();
      if (!t) {
        continue;
      }
      expect(t.placeholder.length).toBeGreaterThan(0);
      expect(t.searchTitle.length).toBeGreaterThan(0);
    }
  });
});
