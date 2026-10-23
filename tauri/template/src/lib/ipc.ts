/**
 * Typed wrappers around Rust commands. Every call goes through `invoke`;
 * keep one wrapper per command so command names and argument shapes live in
 * one place. Module wrappers live in src/features/<id>/api.ts.
 */
import { invoke } from "@tauri-apps/api/core";

export interface AppInfo {
  name: string;
  version: string;
  platform: string;
  arch: string;
  tauri: string;
  profile: string;
  modules: string[];
}

export const ipc = {
  app: {
    info: () => invoke<AppInfo>("app_info"),
  },
  shell: {
    openExternal: (url: string) => invoke<void>("open_external", { url }),
  },
};
