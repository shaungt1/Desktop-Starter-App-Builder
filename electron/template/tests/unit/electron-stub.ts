/**
 * Minimal stand-in for the "electron" module so main-process logic can be
 * unit-tested in Node. Tests that need more behavior mock it with vi.mock.
 */
import { vi } from "vitest";

export const app = {
  getPath: vi.fn(() => "/tmp/dsab-test-user-data"),
  getVersion: vi.fn(() => "0.0.0-test"),
  getAppPath: vi.fn(() => process.cwd()),
  isPackaged: false,
  on: vi.fn(),
  quit: vi.fn(),
};
export const shell = { openExternal: vi.fn(async () => undefined) };
export const safeStorage = {
  isEncryptionAvailable: vi.fn(() => true),
  encryptString: vi.fn((value: string) => Buffer.from(`enc:${value}`)),
  decryptString: vi.fn((value: Buffer) => value.toString().replace(/^enc:/u, "")),
};
export const nativeTheme = { themeSource: "system", shouldUseDarkColors: false };
export const ipcMain = { on: vi.fn(), handle: vi.fn() };
export const dialog = { showOpenDialog: vi.fn(), showSaveDialog: vi.fn() };
export const BrowserWindow = { fromWebContents: vi.fn(() => null), getAllWindows: vi.fn(() => []) };
export const Notification = Object.assign(vi.fn(), { isSupported: vi.fn(() => true) });
export default { app, shell, safeStorage, nativeTheme, ipcMain, dialog, BrowserWindow, Notification };
