/**
 * The extension's saved settings, as typed items in browser storage.
 *
 * `sync:` items follow the user's browser profile across devices; `local:` items
 * stay on this device. Each item has a fallback, so reading never returns null.
 * Use `watch` (or the `useStorageItem` hook) to react when another part of the
 * extension changes a value.
 */
import { storage } from "wxt/utils/storage";

/** Whether the extension is active on pages. */
export const enabledSetting = storage.defineItem<boolean>("sync:enabled", { fallback: true });

/** The text shown in the popup greeting. */
export const greetingSetting = storage.defineItem<string>("sync:greeting", { fallback: "Hello from __APP_NAME__" });
