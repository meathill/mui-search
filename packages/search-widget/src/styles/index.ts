import { WIDGET_STYLE_DIALOG } from "./dialog";
import { WIDGET_STYLE_MEDIA_QUERIES } from "./media-queries";
import { WIDGET_STYLE_RESULTS_AND_MOTION } from "./results-and-motion";
import { WIDGET_STYLE_ROOT_AND_CONTROLS } from "./root-and-controls";
import { WIDGET_STYLE_SUGGESTION_AND_HOT } from "./suggestion-and-hot";

const STYLE_SEGMENTS = [
  WIDGET_STYLE_ROOT_AND_CONTROLS,
  WIDGET_STYLE_SUGGESTION_AND_HOT,
  WIDGET_STYLE_RESULTS_AND_MOTION,
  WIDGET_STYLE_MEDIA_QUERIES,
  WIDGET_STYLE_DIALOG,
] as const;

export function composeWidgetStyleText(): string {
  return `\n${STYLE_SEGMENTS.join("\n\n")}\n`;
}
