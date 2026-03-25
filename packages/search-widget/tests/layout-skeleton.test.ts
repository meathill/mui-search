import { describe, expect, it } from "vitest";

import {
  buildPlaceholderIndexes,
  buildRemainingPlaceholderIndexes,
  calculateListMinHeight,
} from "../src/layout-skeleton";

describe("layout-skeleton", () => {
  it("应根据 limit 生成占位序号", () => {
    expect(buildPlaceholderIndexes(4)).toEqual([0, 1, 2, 3]);
  });

  it("limit 非法时至少保留 1 行占位", () => {
    expect(buildPlaceholderIndexes(0)).toEqual([0]);
    expect(buildPlaceholderIndexes(Number.NaN)).toEqual([0]);
  });

  it("应按行高和间距计算最小高度", () => {
    expect(calculateListMinHeight(4, 40, 6)).toBe(178);
  });

  it("应根据已渲染条目补齐剩余占位行", () => {
    expect(buildRemainingPlaceholderIndexes(8, 3)).toEqual([0, 1, 2, 3, 4]);
    expect(buildRemainingPlaceholderIndexes(8, 8)).toEqual([]);
    expect(buildRemainingPlaceholderIndexes(8, 12)).toEqual([]);
  });

  it("补齐占位行的参数非法时应回退", () => {
    expect(buildRemainingPlaceholderIndexes(Number.NaN, 1)).toEqual([]);
    expect(buildRemainingPlaceholderIndexes(5, Number.NaN)).toEqual([0, 1, 2, 3, 4]);
  });
});
