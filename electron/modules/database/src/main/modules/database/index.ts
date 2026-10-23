/**
 * Database module: opens the SQLite file at start-up, runs migrations and
 * exposes the example notes procedures to the renderer.
 */
import path from "node:path";
import { z } from "zod";
import { procedure } from "../../ipc/procedure";
import { defineMainModule } from "../types";
import { type Database, openDatabase } from "./database";
import { createNotesRepository, type NotesRepository } from "./notes-repository";

let db: Database | undefined;
let notes: NotesRepository | undefined;

/** The open database, for other main-process modules. Throws before start-up completes. */
export function getDatabase(): Database {
  if (!db) {
    throw new Error("Database not open yet.");
  }
  return db;
}

function repository(): NotesRepository {
  if (!notes) {
    throw new Error("Database not open yet.");
  }
  return notes;
}

export const mainModule = defineMainModule({
  id: "database",
  setup({ app, logger }) {
    const file = path.join(app.getPath("userData"), "app.db");
    db = openDatabase(file);
    notes = createNotesRepository(db);
    logger.info(`database open: ${file}`);
  },
  dispose() {
    db?.close();
    db = undefined;
  },
  router: {
    listNotes: procedure.handler(() => repository().list()),
    createNote: procedure
      .input(z.object({ title: z.string().trim().min(1).max(200), body: z.string().max(100_000).default("") }))
      .handler(({ input }) => repository().create(input.title, input.body)),
    deleteNote: procedure
      .input(z.object({ id: z.number().int().positive() }))
      .handler(({ input }) => repository().remove(input.id)),
  },
});
