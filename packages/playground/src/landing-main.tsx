import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { LandingPage } from "./landing";
import "./landing.css";

const root = document.getElementById("app");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <LandingPage />
    </StrictMode>,
  );
}
