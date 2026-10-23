import { browser } from "wxt/browser";

/** The side-panel APIs differ by browser; these shapes cover only the calls used here. */
interface ChromeSidePanel {
  open(options: { windowId: number }): Promise<void>;
}
interface FirefoxSidebar {
  open(): Promise<void>;
}
const api = browser as unknown as { sidePanel?: ChromeSidePanel; sidebarAction?: FirefoxSidebar };

/** True when this browser has a side panel the extension may open (Chrome and Edge: sidePanel; Firefox: sidebarAction). */
export function canOpenSidePanel(): boolean {
  return Boolean(api.sidePanel?.open ?? api.sidebarAction?.open);
}

/** Opens the side panel. Must be called from a user gesture such as a click. */
export async function openSidePanel(): Promise<void> {
  if (api.sidePanel) {
    const current = await browser.windows.getCurrent();
    if (current.id !== undefined) {
      await api.sidePanel.open({ windowId: current.id });
    }
    return;
  }
  await api.sidebarAction?.open();
}
