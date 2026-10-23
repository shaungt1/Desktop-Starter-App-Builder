/**
 * Contract every main-process module implements. A module is a folder under
 * src/main/modules/<id>/ whose index.ts exports `mainModule`; the generated
 * registry.ts lists the enabled ones and router.ts exposes their procedures.
 */
import type { App } from "electron";
import type { AppConfig } from "../app-config";
import type { Logger } from "../logger";

export interface ModuleContext {
  app: App;
  config: AppConfig;
  logger: Logger;
}

export interface MainModule {
  /** Matches the module id in the builder catalog and the folder name. */
  id: string;
  /** Procedures exposed to the renderer under `ipc.<camelCaseId>`. */
  router: Record<string, unknown>;
  /** Runs at start-up before Electron is ready (for work that must happen first, such as crash reporting). */
  beforeReady?: (context: ModuleContext) => void;
  /** Runs once after the app is ready and before the first window opens. */
  setup?: (context: ModuleContext) => void | Promise<void>;
  /** Runs when the app quits. */
  dispose?: () => void | Promise<void>;
}

/** Identity helper that keeps the module's exact router type for the renderer. */
export function defineMainModule<T extends MainModule>(module: T): T {
  return module;
}
