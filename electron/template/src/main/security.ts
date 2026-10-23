/**
 * Security rules applied to every window and session.
 *
 * - The renderer runs sandboxed with context isolation and no Node access.
 * - Navigation is limited to trusted origins; other links open in the system browser.
 * - New windows are never created by page content.
 * - Permission requests (camera, notifications, geolocation...) are denied unless allow-listed.
 */
import { type BrowserWindow, type Session, shell } from "electron";

/** Permissions page content may receive. Add entries deliberately, e.g. "clipboard-sanitized-write". */
const ALLOWED_PERMISSIONS = new Set<string>(["clipboard-sanitized-write"]);

/** True when `url` uses http(s) and its origin is in `trustedOrigins`, or it is a local app file. */
export function isTrustedUrl(url: string, trustedOrigins: readonly string[]): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol === "file:" || parsed.protocol === "app:") {
    return true;
  }
  return trustedOrigins.includes(parsed.origin);
}

/** Only web links are handed to the operating system; everything else is dropped. */
export function isExternalWebUrl(url: string): boolean {
  try {
    const { protocol } = new URL(url);
    return protocol === "https:" || protocol === "http:" || protocol === "mailto:";
  } catch {
    return false;
  }
}

export function hardenSession(session: Session): void {
  session.setPermissionRequestHandler((_contents, permission, callback) => {
    callback(ALLOWED_PERMISSIONS.has(permission));
  });
  session.setPermissionCheckHandler((_contents, permission) => ALLOWED_PERMISSIONS.has(permission));
}

export function hardenWindow(window: BrowserWindow, trustedOrigins: () => readonly string[]): void {
  const contents = window.webContents;
  contents.setWindowOpenHandler(({ url }) => {
    if (isExternalWebUrl(url)) {
      void shell.openExternal(url);
    }
    return { action: "deny" };
  });
  contents.on("will-navigate", (event, url) => {
    if (!isTrustedUrl(url, trustedOrigins())) {
      event.preventDefault();
      if (isExternalWebUrl(url)) {
        void shell.openExternal(url);
      }
    }
  });
  contents.on("will-attach-webview", (event) => {
    event.preventDefault();
  });
}
