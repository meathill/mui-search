import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { DocsPage } from "./docs-renderer";
import "./landing.css";
import markdownEn from "../docs/wordpress.en.md?raw";
import markdownZh from "../docs/wordpress.zh.md?raw";

createRoot(document.getElementById("app")!).render(
  <StrictMode>
    <DocsPage markdownZh={markdownZh} markdownEn={markdownEn} />
  </StrictMode>,
);
