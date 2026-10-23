/**
 * Light/dark theme. The choice is saved with the store plugin
 * (preferences.json in the app data folder); "system" follows the OS.
 */
import { load } from "@tauri-apps/plugin-store";

export type ThemeMode = "system" | "light" | "dark";

const STORE_FILE = "preferences.json";
const systemDark = () => window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;

export function applyTheme(mode: ThemeMode): boolean {
  const dark = mode === "dark" || (mode === "system" && systemDark());
  document.documentElement.classList.toggle("dark", dark);
  return dark;
}

export async function getThemeMode(): Promise<ThemeMode> {
  const store = await load(STORE_FILE, { defaults: { theme: "system" } });
  return (await store.get<ThemeMode>("theme")) ?? "system";
}

export async function setThemeMode(mode: ThemeMode): Promise<{ mode: ThemeMode; dark: boolean }> {
  const store = await load(STORE_FILE, { defaults: { theme: "system" } });
  await store.set("theme", mode);
  await store.save();
  return { mode, dark: applyTheme(mode) };
}

/** Applies the saved theme and keeps "system" in sync with OS changes. */
export async function initTheme(): Promise<void> {
  const mode = await getThemeMode();
  applyTheme(mode);
  window.matchMedia?.("(prefers-color-scheme: dark)").addEventListener("change", () => {
    void getThemeMode().then(applyTheme);
  });
}
