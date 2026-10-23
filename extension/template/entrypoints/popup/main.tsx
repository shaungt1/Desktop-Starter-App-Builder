import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PopupScreen } from "@/src/app/popup-screen";
import "@/src/styles/globals.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("popup/index.html has no #root element.");
}
createRoot(root).render(
  <StrictMode>
    <PopupScreen />
  </StrictMode>,
);
