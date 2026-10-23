/**
 * Local SQLite database using Node's built-in `node:sqlite` module, which
 * Electron's main process includes. No native add-on, no rebuild step and no
 * extra install size.
 *
 * The database file lives in the app's user-data folder
 * (Windows %APPDATA%\<app>, macOS ~/Library/Application Support/<app>,
 * Linux ~/.config/<app>) and is never written inside the install folder.
 */
import { DatabaseSync } from "node:sqlite";
import { MIGRATIONS, type Migration } from "./migrations";

export type Database = DatabaseSync;

/** Opens (or creates) the database and applies pending migrations in order. */
export function openDatabase(file: string, migrations: readonly Migration[] = MIGRATIONS): Database {
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  migrate(db, migrations);
  return db;
}

/**
 * Applies every migration whose version is higher than the stored
 * `user_version`, each inside a transaction, so a failed migration leaves
 * the database unchanged.
 */
export function migrate(db: Database, migrations: readonly Migration[]): number {
  const row = db.prepare("PRAGMA user_version").get() as { user_version: number };
  let current = row.user_version;
  const pending = [...migrations].sort((a, b) => a.version - b.version).filter((m) => m.version > current);
  for (const migration of pending) {
    db.exec("BEGIN");
    try {
      db.exec(migration.sql);
      db.exec(`PRAGMA user_version = ${Math.trunc(migration.version)}`);
      db.exec("COMMIT");
      current = migration.version;
    } catch (error) {
      db.exec("ROLLBACK");
      throw new Error(`Migration ${migration.version} (${migration.name}) failed: ${(error as Error).message}`);
    }
  }
  return current;
}
