/**
 * Loads the bundled React interface into a window. Every profile uses it:
 * the native profile as its only content, the remote and exported profiles
 * for their offline/error screen.
 */
import path from "node:path";
import { app, type BrowserWindow } from "electron";

/** The Vite dev server origin during `bun run dev`; empty in a packaged app (files load from disk). */
export function localRendererOrigins(): string[] {
  return MAIN_WINDOW_VITE_DEV_SERVER_URL ? [new URL(MAIN_WINDOW_VITE_DEV_SERVER_URL).origin] : [];
}

/** Loads the local interface at a hash route such as "/" or "/offline". */
export async function loadLocalRenderer(window: BrowserWindow, route = "/"): Promise<void> {
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    await window.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}#${route}`);
    return;
  }
  await window.loadFile(path.join(app.getAppPath(), ".vite", "renderer", MAIN_WINDOW_VITE_NAME, "index.html"), {
    hash: route,
  });
}
