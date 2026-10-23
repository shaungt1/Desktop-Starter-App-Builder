/**
 * What the main window shows — native profile.
 *
 * The window shows the bundled React interface (src/renderer). The remote and
 * exported profiles replace this file with their own version exposing the
 * same three functions, so nothing else in the main process changes.
 */
import type { BrowserWindow } from "electron";
import { loadLocalRenderer, localRendererOrigins } from "./local-renderer";

/** Called before the app is ready; the native profile registers no custom schemes. */
export function registerContentSchemes(): void {}

/** Origins allowed to navigate inside the window and to use the native bridge. */
export function trustedOrigins(): string[] {
  return localRendererOrigins();
}

export async function loadContent(window: BrowserWindow): Promise<void> {
  await loadLocalRenderer(window, "/");
}
