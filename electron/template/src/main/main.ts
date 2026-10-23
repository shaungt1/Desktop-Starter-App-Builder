/**
 * Main-process entry point: single-instance lock, deep links, security
 * defaults, module start-up, the IPC server and the main window.
 */
import { app, nativeTheme, session } from "electron";
import started from "electron-squirrel-startup";
import { appConfig } from "./app-config";
import { registerContentSchemes, trustedOrigins } from "./content";
import { dispatchDeepLink, findDeepLink, registerScheme } from "./deep-links";
import { startIpcServer } from "./ipc/server";
import { lifecycle } from "./lifecycle";
import { logger } from "./logger";
import { enabledModules } from "./modules/registry";
import { preferences } from "./preferences";
import { hardenSession } from "./security";
import { showMainWindow } from "./window";

// Windows installer (Squirrel) runs the app with special flags during install/uninstall.
if (started) {
  app.quit();
}

app.setAppUserModelId(appConfig.appId);
registerContentSchemes();
for (const module of enabledModules) {
  module.beforeReady?.({ app, config: appConfig, logger });
}

if (!app.requestSingleInstanceLock()) {
  // Another copy is running; it receives our arguments through "second-instance".
  app.quit();
} else {
  app.on("second-instance", (_event, argv) => {
    void showMainWindow();
    const link = findDeepLink(argv);
    if (link) {
      dispatchDeepLink(link);
    }
  });

  // macOS delivers links through this event, possibly before "ready".
  app.on("open-url", (event, url) => {
    event.preventDefault();
    dispatchDeepLink(url);
  });

  app
    .whenReady()
    .then(async () => {
      registerScheme();
      hardenSession(session.defaultSession);
      nativeTheme.themeSource = preferences.get("theme");

      for (const module of enabledModules) {
        await module.setup?.({ app, config: appConfig, logger });
        logger.info(`module ready: ${module.id}`);
      }

      startIpcServer(trustedOrigins);
      await showMainWindow();

      const launchLink = findDeepLink(process.argv);
      if (launchLink) {
        dispatchDeepLink(launchLink);
      }
      logger.info(`${appConfig.name} ${app.getVersion()} started (${appConfig.profile} profile)`);
    })
    .catch((error: unknown) => {
      logger.error("Start-up failed", error);
      app.exit(1);
    });

  app.on("activate", () => {
    void showMainWindow();
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin" && !lifecycle.keepRunningInBackground) {
      app.quit();
    }
  });

  app.on("before-quit", () => {
    lifecycle.quitting = true;
    for (const module of [...enabledModules].reverse()) {
      Promise.resolve(module.dispose?.()).catch((error: unknown) => {
        logger.error(`module dispose failed: ${module.id}`, error);
      });
    }
  });
}
