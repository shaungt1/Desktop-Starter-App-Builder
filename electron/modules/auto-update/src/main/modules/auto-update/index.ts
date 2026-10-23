/**
 * Auto-update module (Windows and macOS) built on update-electron-app, which
 * drives Electron's built-in Squirrel updater.
 *
 * Plan options (moduleOptions["auto-update"]):
 * - source: "github" (default) — free update.electronjs.org service; the
 *   repository in the plan must be PUBLIC and releases published to GitHub.
 * - source: "static" with baseUrl — any static file host (S3, R2, a web
 *   server) where you upload the Forge build output; works for private apps.
 *
 * Linux .deb/.rpm installs update through the system package manager instead.
 */
import { UpdateSourceType, updateElectronApp } from "update-electron-app";
import { appConfig, moduleOptions } from "../../app-config";
import { procedure } from "../../ipc/procedure";
import { defineMainModule } from "../types";

interface Options extends Record<string, unknown> {
  source: "github" | "static";
  baseUrl: string;
  /** How often to check, e.g. "1 hour" (minimum 5 minutes). */
  interval: string;
}

let state: { enabled: boolean; reason: string; source: string } = {
  enabled: false,
  reason: "not started",
  source: "none",
};

export const mainModule = defineMainModule({
  id: "auto-update",
  setup({ app, logger }) {
    const options = moduleOptions<Options>("auto-update");
    const source = options.source ?? "github";
    if (!app.isPackaged) {
      state = { enabled: false, reason: "development build", source };
      return;
    }
    if (process.platform !== "win32" && process.platform !== "darwin") {
      state = { enabled: false, reason: "Linux updates come from the package manager", source };
      return;
    }
    if (source === "static") {
      if (!options.baseUrl) {
        state = { enabled: false, reason: "moduleOptions.auto-update.baseUrl is not set", source };
        logger.warn(state.reason);
        return;
      }
      const platformFolder = `${process.platform}/${process.arch}`;
      updateElectronApp({
        updateSource: {
          type: UpdateSourceType.StaticStorage,
          baseUrl: `${options.baseUrl.replace(/\/$/u, "")}/${platformFolder}`,
        },
        updateInterval: options.interval ?? "1 hour",
        logger,
      });
    } else {
      if (!appConfig.repository) {
        state = { enabled: false, reason: "plan has no repository (owner/name)", source };
        logger.warn(state.reason);
        return;
      }
      updateElectronApp({
        updateSource: { type: UpdateSourceType.ElectronPublicUpdateService, repo: appConfig.repository },
        updateInterval: options.interval ?? "1 hour",
        logger,
      });
    }
    state = { enabled: true, reason: "checking periodically", source };
  },
  router: {
    status: procedure.handler(() => state),
  },
});
