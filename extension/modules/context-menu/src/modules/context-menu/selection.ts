import { storage } from "wxt/utils/storage";

/** The text most recently sent through the right-click menu; kept on this device only. */
export const lastSelectionSetting = storage.defineItem<string>("local:lastSelection", { fallback: "" });

/** Saves a selection, trimmed and limited to 500 characters (selected text comes from any web page and is untrusted). */
export async function saveSelection(text: string): Promise<string> {
  const cleaned = text.trim().slice(0, 500);
  await lastSelectionSetting.setValue(cleaned);
  return cleaned;
}
