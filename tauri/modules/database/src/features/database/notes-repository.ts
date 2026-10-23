/**
 * Example repository: all SQL for one table in one place, with typed rows.
 * Queries use $1, $2... placeholders, so values are never concatenated into SQL.
 */
import Database from "@tauri-apps/plugin-sql";

/** Must match DATABASE_URL in src-tauri/src/modules/database.rs. */
export const DATABASE_URL = "sqlite:app.db";

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

/** The subset of the plugin's Database class the repository uses (lets tests pass a fake). */
export interface SqlConnection {
  select<T>(query: string, values?: unknown[]): Promise<T>;
  execute(query: string, values?: unknown[]): Promise<{ rowsAffected: number; lastInsertId?: number }>;
}

const toNote = (row: NoteRow): Note => ({
  id: row.id,
  title: row.title,
  body: row.body,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export function createNotesRepository(connect: () => Promise<SqlConnection>) {
  let connection: Promise<SqlConnection> | undefined;
  const db = () => {
    connection ??= connect();
    return connection;
  };

  return {
    async list(limit = 100): Promise<Note[]> {
      const rows = await (await db()).select<NoteRow[]>(
        "SELECT * FROM notes ORDER BY updated_at DESC, id DESC LIMIT $1",
        [limit],
      );
      return rows.map(toNote);
    },
    async create(title: string, body = ""): Promise<void> {
      const clean = title.trim();
      if (clean.length === 0 || clean.length > 200) {
        throw new Error("Title must be 1 to 200 characters.");
      }
      await (await db()).execute("INSERT INTO notes (title, body) VALUES ($1, $2)", [clean, body]);
    },
    async remove(id: number): Promise<boolean> {
      const result = await (await db()).execute("DELETE FROM notes WHERE id = $1", [id]);
      return result.rowsAffected > 0;
    },
  };
}

export const notesRepository = createNotesRepository(() => Database.load(DATABASE_URL));
