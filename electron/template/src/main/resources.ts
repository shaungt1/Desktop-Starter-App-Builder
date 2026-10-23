/**
 * Paths to files shipped beside the app (forge.config.ts `extraResource`)
 * and to bundled worker scripts.
 *
 * A packaged app runs from resources/app.asar, and extra resources sit next to
 * that archive. In development (`bun run dev`) the app runs from the project
 * folder, so the same files are read from the project instead.
 */
import path from "node:path";
import { app } from "electron";

/** True when running from an app.asar archive (installed app or end-to-end tests). */
export function runningFromArchive(): boolean {
  return app.getAppPath().endsWith(".asar");
}

/** Folder holding the extra resources, or the project folder during development. */
export function resourcesFolder(): string {
  return runningFromArchive() ? path.dirname(app.getAppPath()) : app.getAppPath();
}

/** `name` is the file's base name, e.g. "icon.png" for assets/icon.png. */
export function resourcePath(name: string): string {
  return runningFromArchive() ? path.join(resourcesFolder(), name) : path.join(app.getAppPath(), "assets", name);
}

/** Path of a bundled worker script from src/main/workers/<name>.ts. */
export function workerPath(name: string): string {
  return path.join(app.getAppPath(), ".vite", "build", `${name}.cjs`);
}
