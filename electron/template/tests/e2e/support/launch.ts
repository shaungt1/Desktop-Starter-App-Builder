/**
 * Starts the packaged app for end-to-end tests. `bun run test:e2e` packages
 * the app first; this helper finds the newest build in out/.
 */
import path from "node:path";
import { type ElectronApplication, _electron as electron } from "@playwright/test";
import { findLatestBuild, parseElectronApp } from "electron-playwright-helpers";

export async function launchPackagedApp(): Promise<ElectronApplication> {
  const build = parseElectronApp(findLatestBuild());
  const args = [path.join(build.resourcesDir, "app.asar")];
  if (process.platform === "linux" && process.getuid?.() === 0) {
    // Chromium refuses to run sandboxed as root (containers, CI images).
    args.push("--no-sandbox");
  }
  return electron.launch({ args });
}
