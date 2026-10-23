/**
 * Creates the main window with secure defaults and remembers its size and
 * position between launches.
 */
import path from "node:path";
import { app, BrowserWindow, screen } from "electron";
import { appConfig } from "./app-config";
import { loadContent, trustedOrigins } from "./content";
import { lifecycle } from "./lifecycle";
import { logger } from "./logger";
import { preferences } from "./preferences";
import { hardenWindow } from "./security";

let mainWindow: BrowserWindow | null = null;

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

/** Keeps saved bounds only if they are still on a connected display. */
function restoredBounds() {
  const saved = preferences.get("window");
  if (saved.x === undefined || saved.y === undefined) {
    return { width: saved.width, height: saved.height };
  }
  const visible = screen.getAllDisplays().some(({ workArea }) => {
    return (
      saved.x !== undefined &&
      saved.y !== undefined &&
      saved.x >= workArea.x &&
      saved.y >= workArea.y &&
      saved.x < workArea.x + workArea.width &&
      saved.y < workArea.y + workArea.height
    );
  });
  return visible ? saved : { width: saved.width, height: saved.height };
}

function saveBounds(window: BrowserWindow): void {
  const bounds = window.getNormalBounds();
  preferences.set("window", { ...bounds, maximized: window.isMaximized() });
}

export async function createMainWindow(): Promise<BrowserWindow> {
  const window = new BrowserWindow({
    ...restoredBounds(),
    minWidth: 720,
    minHeight: 480,
    title: appConfig.name,
    show: false,
    backgroundColor: "#00000000",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(app.getAppPath(), ".vite", "build", "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      spellcheck: true,
      devTools: !app.isPackaged,
    },
  });
  mainWindow = window;
  hardenWindow(window, trustedOrigins);

  if (preferences.get("window").maximized) {
    window.maximize();
  }
  window.once("ready-to-show", () => window.show());
  window.on("close", (event) => {
    saveBounds(window);
    if (lifecycle.keepRunningInBackground && !lifecycle.quitting) {
      event.preventDefault();
      window.hide();
    }
  });
  window.on("closed", () => {
    if (mainWindow === window) {
      mainWindow = null;
    }
  });
  window.webContents.on("render-process-gone", (_event, details) => {
    logger.error(`Renderer stopped: ${details.reason}`);
  });

  await loadContent(window);
  return window;
}

/** Shows and focuses the main window, creating it if needed. */
export async function showMainWindow(): Promise<BrowserWindow> {
  const window = mainWindow ?? (await createMainWindow());
  if (window.isMinimized()) {
    window.restore();
  }
  window.show();
  window.focus();
  return window;
}
