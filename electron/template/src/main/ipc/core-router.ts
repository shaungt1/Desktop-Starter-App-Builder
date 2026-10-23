/**
 * Procedures every generated app has, regardless of modules.
 */
import { app, nativeTheme, shell } from "electron";
import { z } from "zod";
import { appConfig } from "../app-config";
import { loadContent } from "../content";
import { preferences, themeModeSchema } from "../preferences";
import { isExternalWebUrl } from "../security";
import { procedure } from "./procedure";

const info = procedure.handler(() => ({
  name: appConfig.name,
  version: app.getVersion(),
  platform: process.platform,
  arch: process.arch,
  electron: process.versions.electron,
  chrome: process.versions.chrome,
  node: process.versions.node,
  profile: appConfig.profile,
  modules: appConfig.modules,
}));

const minimize = procedure.handler(({ context }) => {
  context.window?.minimize();
});

const toggleMaximize = procedure.handler(({ context }) => {
  const window = context.window;
  if (!window) {
    return;
  }
  if (window.isMaximized()) {
    window.unmaximize();
  } else {
    window.maximize();
  }
});

/** Loads the window's content again (used by the offline screen's "Try again" button). */
const reloadContent = procedure.handler(async ({ context }) => {
  if (context.window) {
    await loadContent(context.window);
  }
});

const getTheme = procedure.handler(() => ({
  mode: preferences.get("theme"),
  dark: nativeTheme.shouldUseDarkColors,
}));

const setTheme = procedure.input(z.object({ mode: themeModeSchema })).handler(({ input }) => {
  preferences.set("theme", input.mode);
  nativeTheme.themeSource = input.mode;
  return { mode: input.mode, dark: nativeTheme.shouldUseDarkColors };
});

const openExternal = procedure.input(z.object({ url: z.url() })).handler(async ({ input }) => {
  if (!isExternalWebUrl(input.url)) {
    throw new Error("Only http, https and mailto links can be opened.");
  }
  await shell.openExternal(input.url);
});

export const coreRouter = {
  app: { info },
  window: { minimize, toggleMaximize, reloadContent },
  theme: { get: getTheme, set: setTheme },
  shell: { openExternal },
};
