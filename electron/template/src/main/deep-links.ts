/**
 * Custom URL scheme handling (e.g. myapp://auth/callback).
 *
 * The operating system starts a second copy of the app when a link is opened.
 * The single-instance lock in main.ts sends that link to this first copy,
 * which then notifies every subscriber (the sign-in module subscribes).
 */
import path from "node:path";
import { app } from "electron";
import { appConfig } from "./app-config";
import { logger } from "./logger";

type DeepLinkListener = (url: URL) => void;

const listeners = new Set<DeepLinkListener>();
const pending: URL[] = [];

/** Registers this app as the handler for its scheme. */
export function registerScheme(): void {
  if (process.defaultApp && process.argv.length >= 2) {
    // Development: Electron is started as `electron <path>`; register with that path.
    app.setAsDefaultProtocolClient(appConfig.scheme, process.execPath, [path.resolve(process.argv[1] ?? ".")]);
  } else {
    app.setAsDefaultProtocolClient(appConfig.scheme);
  }
}

/** Finds an argument that is a link for this app's scheme. */
export function findDeepLink(argv: readonly string[]): string | undefined {
  return argv.find((argument) => argument.startsWith(`${appConfig.scheme}://`));
}

export function dispatchDeepLink(raw: string): void {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    logger.warn("Ignored malformed deep link");
    return;
  }
  if (url.protocol !== `${appConfig.scheme}:`) {
    return;
  }
  if (listeners.size === 0) {
    pending.push(url);
    return;
  }
  for (const listener of listeners) {
    listener(url);
  }
}

/** Subscribes to deep links. Links that arrived before the first subscriber are replayed. */
export function onDeepLink(listener: DeepLinkListener): () => void {
  listeners.add(listener);
  for (const url of pending.splice(0)) {
    listener(url);
  }
  return () => listeners.delete(listener);
}
