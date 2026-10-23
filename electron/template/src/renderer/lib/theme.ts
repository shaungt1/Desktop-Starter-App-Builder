/**
 * Light/dark theme. The choice is saved by the main process (preferences)
 * and applied to Electron's nativeTheme; "system" follows the operating
 * system. This file exposes the same functions as the Tauri app's theme.ts,
 * so the shared settings screen works on both bases.
 */
import { ipc } from "@/lib/ipc";

export type ThemeMode = "system" | "light" | "dark";

/** Applies the resolved light/dark mode to the document so Tailwind's dark: variants follow it. */
export function applyDarkMode(dark: boolean): void {
  document.documentElement.classList.toggle("dark", dark);
}

export async function getThemeMode(): Promise<ThemeMode> {
  return (await ipc.theme.get()).mode;
}

export async function setThemeMode(mode: ThemeMode): Promise<{ mode: ThemeMode; dark: boolean }> {
  const result = await ipc.theme.set({ mode });
  applyDarkMode(result.dark);
  return { mode, dark: result.dark };
}

/** Applies the saved theme when the interface starts. */
export async function initTheme(): Promise<void> {
  const { dark } = await ipc.theme.get();
  applyDarkMode(dark);
}
