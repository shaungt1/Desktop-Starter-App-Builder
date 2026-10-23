/**
 * What the main window shows — remote profile.
 *
 * The window loads the hosted web app at `remoteUrl` from the plan
 * (app.config.json). Navigation may stay on that origin and on any
 * `allowedOrigins` (for example a sign-in provider); other links open in the
 * system browser. When the site cannot load, the bundled offline screen is shown.
 *
 * The hosted page may use the native bridge only because its origin is
 * trusted here; the main process re-checks the origin on every connection.
 */
import type { BrowserWindow } from "electron";
import { appConfig } from "./app-config";
import { loadLocalRenderer, localRendererOrigins } from "./local-renderer";
import { logger } from "./logger";

/** Chromium's code for a navigation that was replaced by another one; not a failure. */
const NAVIGATION_ABORTED = -3;

function remoteUrl(): string {
  if (!appConfig.remoteUrl) {
    throw new Error("The remote profile needs remoteUrl in app.config.json.");
  }
  return appConfig.remoteUrl;
}

export function registerContentSchemes(): void {}

export function trustedOrigins(): string[] {
  return [new URL(remoteUrl()).origin, ...appConfig.allowedOrigins, ...localRendererOrigins()];
}

const watched = new WeakSet<BrowserWindow>();
/** Windows currently inside loadContent(), whose failures loadContent handles itself. */
const loading = new WeakSet<BrowserWindow>();

async function showOffline(window: BrowserWindow): Promise<void> {
  try {
    await loadLocalRenderer(window, "/offline");
  } catch (error) {
    logger.error("Could not show the offline screen", error);
  }
}

export async function loadContent(window: BrowserWindow): Promise<void> {
  if (!watched.has(window)) {
    watched.add(window);
    // Later navigations inside the hosted app that fail (connection lost) also show the offline screen.
    window.webContents.on("did-fail-load", (_event, code, description, url, isMainFrame) => {
      if (isMainFrame && !loading.has(window) && code !== NAVIGATION_ABORTED && url.startsWith("http")) {
        logger.warn(`Remote content failed (${code} ${description}): ${url}`);
        void showOffline(window);
      }
    });
  }
  loading.add(window);
  try {
    await window.loadURL(remoteUrl());
  } catch (error) {
    logger.warn("Remote content unavailable; showing offline screen", error);
    await showOffline(window);
  } finally {
    loading.delete(window);
  }
}
