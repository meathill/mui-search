import { describe, expect, it } from "vitest";

import { composeWidgetStyleText } from "../src/styles";

describe("search-widget-styles", () => {
  it("应包含核心样式选择器", () => {
    const styleText = composeWidgetStyleText();

    expect(styleText).toContain(".asw-root");
    expect(styleText).toContain(".asw-suggestion");
    expect(styleText).toContain(".asw-result");
    expect(styleText).toContain(".asw-dialog");
    expect(styleText).toContain("@media (prefers-color-scheme: dark)");
  });

  it("样式片段顺序应稳定，避免覆盖关系回归", () => {
    const styleText = composeWidgetStyleText();

    const rootIndex = styleText.indexOf(".asw-root");
    const suggestionIndex = styleText.indexOf(".asw-suggestion");
    const resultIndex = styleText.indexOf(".asw-result");
    const mediaIndex = styleText.indexOf("@media (prefers-color-scheme: dark)");
    const dialogIndex = styleText.indexOf(".asw-dialog");

    expect(rootIndex).toBeGreaterThanOrEqual(0);
    expect(suggestionIndex).toBeGreaterThan(rootIndex);
    expect(resultIndex).toBeGreaterThan(suggestionIndex);
    expect(mediaIndex).toBeGreaterThan(resultIndex);
    expect(dialogIndex).toBeGreaterThan(mediaIndex);
  });
});
