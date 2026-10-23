/**
 * Example repository: all SQL for one table in one place, with typed rows.
 * Replace "notes" with your own entities and keep the same shape.
 */
import type { Database } from "./database";

export interface Note {
  id: number;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

interface NoteRow {
  id: number;
  title: string;
  body: string;
  created_at: string;
  updated_at: string;
}

const toNote = (row: NoteRow): Note => ({
  id: row.id,
  title: row.title,
  body: row.body,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export function createNotesRepository(db: Database) {
  const listStatement = db.prepare("SELECT * FROM notes ORDER BY updated_at DESC, id DESC LIMIT ?");
  const insertStatement = db.prepare("INSERT INTO notes (title, body) VALUES (?, ?) RETURNING *");
  const deleteStatement = db.prepare("DELETE FROM notes WHERE id = ?");

  return {
    list(limit = 100): Note[] {
      return (listStatement.all(limit) as unknown as NoteRow[]).map(toNote);
    },
    create(title: string, body = ""): Note {
      return toNote(insertStatement.get(title, body) as unknown as NoteRow);
    },
    remove(id: number): boolean {
      return Number(deleteStatement.run(id).changes) > 0;
    },
  };
}

export type NotesRepository = ReturnType<typeof createNotesRepository>;
