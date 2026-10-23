/**
 * What the main window shows — Next.js frontend.
 *
 * Development (`dev` script): the window loads the Next.js dev server, which
 * the dev script starts next to Electron Forge. The window retries until the
 * server answers, because both start at the same time.
 *
 * Packaged app: `next build` exports every route as static files into
 * web-export/ (next.config.ts), Forge ships that folder next to app.asar, and
 * this file serves it through a private app:// scheme. A custom scheme is used
 * instead of file:// so absolute asset paths such as /_next/... resolve.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { type BrowserWindow, net, protocol } from "electron";
import { exportCandidates } from "./export-path";
import { logger } from "./logger";
import { resourcesFolder, runningFromArchive } from "./resources";

const SCHEME = "app";
const ENTRY_URL = `${SCHEME}://bundle/`;
/** The Next.js dev server; override with NEXT_DEV_URL when port 3000 is taken. */
const DEV_URL = process.env.NEXT_DEV_URL ?? "http://localhost:3000";

/**
 * Next.js writes small inline scripts that hydrate each static page, so
 * script-src must allow inline scripts; everything else is limited to the app itself.
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
].join("; ");

export function registerContentSchemes(): void {
  protocol.registerSchemesAsPrivileged([
    { scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
  ]);
}

/** Origins allowed to navigate in the window and to use the native bridge (app:// is always trusted). */
export function trustedOrigins(): string[] {
  return runningFromArchive() ? [] : [new URL(DEV_URL).origin];
}

function exportRoot(): string {
  return path.join(resourcesFolder(), "web-export");
}

async function serve(file: string, status = 200): Promise<Response> {
  const response = await net.fetch(pathToFileURL(file).toString());
  const headers = new Headers(response.headers);
  headers.set("Content-Security-Policy", CONTENT_SECURITY_POLICY);
  return new Response(response.body, { status, headers });
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
      return serve(file);
    }
    const notFound = path.join(root, "404.html");
    if (fs.existsSync(notFound)) {
      return serve(notFound, 404);
    }
    return new Response("Not found", { status: 404 });
  });
}

async function loadDevServer(window: BrowserWindow): Promise<void> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      await window.loadURL(DEV_URL);
      return;
    } catch (error) {
      if (attempt >= 60 || window.isDestroyed()) {
        throw error;
      }
      logger.info(`Waiting for the Next.js dev server at ${DEV_URL} (attempt ${attempt})`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

export async function loadContent(window: BrowserWindow): Promise<void> {
  if (!runningFromArchive()) {
    await loadDevServer(window);
    return;
  }
  registerHandler();
  if (!fs.existsSync(path.join(exportRoot(), "index.html"))) {
    logger.error(`No index.html in ${exportRoot()}; run the build:web script before packaging.`);
  }
  await window.loadURL(ENTRY_URL);
}
