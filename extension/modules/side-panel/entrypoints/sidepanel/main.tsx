import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { SidePanelScreen } from "@/src/app/side-panel-screen";
import "@/src/styles/globals.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("sidepanel/index.html has no #root element.");
}
createRoot(root).render(
  <StrictMode>
    <SidePanelScreen />
  </StrictMode>,
);
