import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { OptionsScreen } from "@/src/app/options-screen";
import "@/src/styles/globals.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("options/index.html has no #root element.");
}
createRoot(root).render(
  <StrictMode>
    <OptionsScreen />
  </StrictMode>,
);
