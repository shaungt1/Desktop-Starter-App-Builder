import { browser } from "wxt/browser";
import type { BackgroundModule } from "../types";
import { saveSelection } from "./selection";

const MENU_ID = "send-selection";

/** Handles a menu click: saves the selected text. Separate from the listener so it can be unit-tested. */
export async function handleMenuClick(info: { menuItemId: string | number; selectionText?: string }): Promise<void> {
  if (info.menuItemId === MENU_ID && info.selectionText) {
    await saveSelection(info.selectionText);
  }
}

/** Adds "Send selection to __APP_NAME__" to the right-click menu when text is selected. */
export const backgroundModule: BackgroundModule = {
  id: "context-menu",
  setup() {
    // Menu items persist across worker restarts, so they are created once, on install or update.
    browser.runtime.onInstalled.addListener(() => {
      browser.contextMenus.create({
        id: MENU_ID,
        title: "Send selection to __APP_NAME__",
        contexts: ["selection"],
      });
    });
    browser.contextMenus.onClicked.addListener((info) => {
      void handleMenuClick(info);
    });
  },
};
