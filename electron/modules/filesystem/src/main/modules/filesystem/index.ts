/**
 * File access module: native open/save dialogs and reading or writing the
 * text files the user picked. Paths are only usable after the user chose
 * them in a dialog (see granted-paths.ts).
 *
 * Folder watching is not included; add chokidar in the main process when needed.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { dialog } from "electron";
import { z } from "zod";
import { procedure } from "../../ipc/procedure";
import { defineMainModule } from "../types";
import { createGrantList } from "./granted-paths";

/** Largest text file the renderer may open in one call. */
const MAX_TEXT_BYTES = 5 * 1024 * 1024;
const grants = createGrantList();

const openTextFile = procedure.handler(async ({ context }) => {
  const options: Electron.OpenDialogOptions = {
    properties: ["openFile"],
    filters: [
      { name: "Text", extensions: ["txt", "md", "json", "csv", "log"] },
      { name: "All files", extensions: ["*"] },
    ],
  };
  const result = context.window
    ? await dialog.showOpenDialog(context.window, options)
    : await dialog.showOpenDialog(options);
  const chosen = result.filePaths[0];
  if (result.canceled || !chosen) {
    return null;
  }
  const file = grants.grant(chosen);
  const stats = await fs.stat(file);
  if (stats.size > MAX_TEXT_BYTES) {
    throw new Error("File is larger than 5 MB.");
  }
  return { path: file, name: path.basename(file), content: await fs.readFile(file, "utf8") };
});

const saveTextFile = procedure
  .input(z.object({ path: z.string().optional(), suggestedName: z.string().max(255).optional(), content: z.string() }))
  .handler(async ({ input, context }) => {
    let file = input.path ? grants.assertGranted(input.path) : undefined;
    if (!file) {
      const options: Electron.SaveDialogOptions = { defaultPath: input.suggestedName ?? "untitled.txt" };
      const result = context.window
        ? await dialog.showSaveDialog(context.window, options)
        : await dialog.showSaveDialog(options);
      if (result.canceled || !result.filePath) {
        return null;
      }
      file = grants.grant(result.filePath);
    }
    await fs.writeFile(file, input.content, "utf8");
    return { path: file, name: path.basename(file) };
  });

export const mainModule = defineMainModule({
  id: "filesystem",
  router: { openTextFile, saveTextFile },
});
