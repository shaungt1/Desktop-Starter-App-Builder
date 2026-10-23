/**
 * Background module: a tray icon, an option to start at login, and a worker
 * process that keeps running when the window is closed (closing the window
 * hides it; "Quit" in the tray menu exits).
 */
import { app, Menu, nativeImage, Tray, type UtilityProcess, utilityProcess } from "electron";
import { z } from "zod";
import { appConfig } from "../../app-config";
import { procedure } from "../../ipc/procedure";
import { lifecycle } from "../../lifecycle";
import { resourcePath, workerPath } from "../../resources";
import { showMainWindow } from "../../window";
import { defineMainModule } from "../types";

let tray: Tray | undefined;
let worker: UtilityProcess | undefined;
let lastHeartbeat: { ticks: number; uptimeSeconds: number } | null = null;

function startWorker(logger: { info: (message: string) => void; error: (message: string) => void }): void {
  worker = utilityProcess.fork(workerPath("background-worker"), [], { serviceName: `${appConfig.name} worker` });
  worker.on("message", (message: { type?: string; ticks: number; uptimeSeconds: number }) => {
    if (message?.type === "heartbeat") {
      lastHeartbeat = { ticks: message.ticks, uptimeSeconds: message.uptimeSeconds };
    }
  });
  worker.on("exit", (code) => {
    worker = undefined;
    if (!lifecycle.quitting) {
      logger.error(`background worker exited (${code}); restarting`);
      setTimeout(() => startWorker(logger), 2_000);
    }
  });
  logger.info("background worker started");
}

export const mainModule = defineMainModule({
  id: "background",
  setup({ logger }) {
    lifecycle.keepRunningInBackground = true;

    const icon = nativeImage.createFromPath(resourcePath("icon.png")).resize({ width: 16, height: 16 });
    tray = new Tray(icon);
    tray.setToolTip(appConfig.name);
    tray.setContextMenu(
      Menu.buildFromTemplate([
        { label: `Open ${appConfig.name}`, click: () => void showMainWindow() },
        { type: "separator" },
        { label: "Quit", click: () => app.quit() },
      ]),
    );
    tray.on("click", () => void showMainWindow());

    startWorker(logger);
  },
  dispose() {
    worker?.kill();
    tray?.destroy();
  },
  router: {
    status: procedure.handler(() => {
      worker?.postMessage({ type: "ping" });
      return {
        workerRunning: Boolean(worker),
        heartbeat: lastHeartbeat,
        launchAtLogin: process.platform === "linux" ? null : app.getLoginItemSettings().openAtLogin,
      };
    }),
    setLaunchAtLogin: procedure.input(z.object({ enabled: z.boolean() })).handler(({ input }) => {
      if (process.platform === "linux") {
        throw new Error("Start-at-login on Linux is set by the desktop environment (an autostart .desktop file).");
      }
      app.setLoginItemSettings({ openAtLogin: input.enabled });
      return app.getLoginItemSettings().openAtLogin;
    }),
  },
});
