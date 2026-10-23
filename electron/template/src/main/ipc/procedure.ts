/**
 * Base builder for every IPC procedure. A procedure is a typed function the
 * renderer can call; Zod schemas validate every input because the renderer
 * is treated as untrusted.
 */
import { os } from "@orpc/server";
import type { BrowserWindow } from "electron";

export interface IpcContext {
  /** The window whose renderer made the call, when it still exists. */
  window: BrowserWindow | null;
}

export const procedure = os.$context<IpcContext>();
