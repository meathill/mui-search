import { composeWidgetStyleText } from "./styles";

const STYLE_ELEMENT_ID = "mui-search-widget-style";
const WIDGET_STYLE_TEXT = composeWidgetStyleText();

export function ensureWidgetStyles(documentRef: Document): void {
  if (documentRef.getElementById(STYLE_ELEMENT_ID)) {
    return;
  }

  const styleElement = documentRef.createElement("style");
  styleElement.id = STYLE_ELEMENT_ID;
  styleElement.textContent = WIDGET_STYLE_TEXT;
  documentRef.head.appendChild(styleElement);
}
