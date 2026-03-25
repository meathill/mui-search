import { describe, expect, it } from "vitest";

import { slimDisplayTitle } from "../src/title-slimmer";

describe("slimDisplayTitle", () => {
  it("应按 ` - ` 切割标题", () => {
    const title = "Elementary School General Knowledge Test - 98% of adults FAILED to pass this. Can you pass it?";
    expect(slimDisplayTitle(title)).toBe("Elementary School General Knowledge Test");
  });

  it("应按 ` / ` 切割标题", () => {
    const title = "Aim Trainer / Visual Stats / Customizable / For Rookie and Pro";
    expect(slimDisplayTitle(title)).toBe("Aim Trainer");
  });

  it("同时存在 ` / ` 与 ` - ` 时应稳定得到第一段", () => {
    const title = "CPS Test / CPS Tester - Choose Test Duration:";
    expect(slimDisplayTitle(title)).toBe("CPS Test");
  });

  it("应截掉半角问号后的内容并保留问号", () => {
    const title = "Which Genshin Impact Character Are You? Version 5.4 Updated";
    expect(slimDisplayTitle(title)).toBe("Which Genshin Impact Character Are You?");
  });

  it("不应把全角问号作为切割点", () => {
    const title = "这是一个标题？后续仍然保留";
    expect(slimDisplayTitle(title)).toBe("这是一个标题？后续仍然保留");
  });

  it("超长标题应追加省略号", () => {
    const title = "Questo Test ti aiuterà a diventare un professionista della relazione";
    expect(slimDisplayTitle(title)).toBe("Questo Test ti aiuterà a diventare un professio...");
  });

  it("可通过参数覆盖最大长度", () => {
    const title = "Alpha Beta Omega Test / Omegaverse Test - Are You An Alpha, Beta or Omega?";
    expect(slimDisplayTitle(title, { maxLength: 10 })).toBe("Alpha Beta...");
  });

  it("空白字符串应返回空字符串", () => {
    expect(slimDisplayTitle("   ")).toBe("");
  });
});
