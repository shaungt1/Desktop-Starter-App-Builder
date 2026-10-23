/**
 * Non-sensitive user preferences (theme, window size) stored as JSON in the
 * app's user-data folder through electron-store. Secrets never go here; use
 * the secure-storage module.
 */
import Store from "electron-store";
import { z } from "zod";

export const themeModeSchema = z.enum(["system", "light", "dark"]);
export type ThemeMode = z.infer<typeof themeModeSchema>;

export interface WindowBounds {
  width: number;
  height: number;
  x?: number;
  y?: number;
  maximized: boolean;
}

interface PreferenceShape {
  theme: ThemeMode;
  window: WindowBounds;
}

export const preferences = new Store<PreferenceShape>({
  name: "preferences",
  defaults: {
    theme: "system",
    window: { width: 1100, height: 720, maximized: false },
  },
});
