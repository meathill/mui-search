import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./app";
import "./style.css";

const container = document.querySelector<HTMLDivElement>("#app");
if (!container) {
  throw new Error("Missing #app container");
}

const root = createRoot(container);
root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);
