/**
 * What the main window shows — exported profile.
 *
 * Serves a static web build (for example `next build` with output: "export")
 * from the web-export folder through a private app:// scheme. A custom scheme
 * is used instead of file:// so absolute asset paths such as /_next/... work.
 * The folder ships inside the installer (forge.config.ts adds it as an extra
 * resource), so the app works offline.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { type BrowserWindow, net, protocol } from "electron";
import { exportCandidates } from "./export-path";
import { loadLocalRenderer, localRendererOrigins } from "./local-renderer";
import { logger } from "./logger";
import { resourcesFolder } from "./resources";

const SCHEME = "app";
const ENTRY_URL = `${SCHEME}://bundle/`;

export function registerContentSchemes(): void {
  protocol.registerSchemesAsPrivileged([
    { scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
  ]);
}

export function trustedOrigins(): string[] {
  // app:// pages are always trusted by security.ts; the dev server is trusted for the offline screen.
  return localRendererOrigins();
}

function exportRoot(): string {
  return path.join(resourcesFolder(), "web-export");
}

let handlerRegistered = false;

function registerHandler(): void {
  if (handlerRegistered) {
    return;
  }
  handlerRegistered = true;
  const root = exportRoot();
  protocol.handle(SCHEME, async (request) => {
    const file = exportCandidates(root, request.url).find((candidate) => fs.existsSync(candidate));
    if (file) {
      return net.fetch(pathToFileURL(file).toString());
    }
    const notFound = path.join(root, "404.html");
    if (fs.existsSync(notFound)) {
      const response = await net.fetch(pathToFileURL(notFound).toString());
      return new Response(response.body, { status: 404, headers: response.headers });
    }
    return new Response("Not found", { status: 404 });
  });
}

export async function loadContent(window: BrowserWindow): Promise<void> {
  registerHandler();
  if (!fs.existsSync(path.join(exportRoot(), "index.html"))) {
    logger.error(`No index.html in ${exportRoot()}; copy your static export there.`);
    await loadLocalRenderer(window, "/offline");
    return;
  }
  await window.loadURL(ENTRY_URL);
}
