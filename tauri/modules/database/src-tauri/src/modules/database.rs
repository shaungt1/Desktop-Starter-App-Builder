//! Database module: SQLite through the official SQL plugin.
//!
//! The database file `app.db` lives in the app's config folder
//! (Windows %APPDATA%\<identifier>, macOS ~/Library/Application Support/<identifier>,
//! Linux ~/.config/<identifier>). Migrations below run in order when the
//! interface first loads the database; each runs once.

use tauri_plugin_sql::{Migration, MigrationKind};

/// Connection string shared with src/features/database/notes-repository.ts.
pub const DATABASE_URL: &str = "sqlite:app.db";

/// Ordered schema changes. Append new entries with the next version; never edit a shipped one.
pub fn migrations() -> Vec<Migration> {
    vec![Migration {
        version: 1,
        description: "create notes",
        sql: "CREATE TABLE notes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
                body TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
                updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
              );
              CREATE INDEX notes_updated_at ON notes (updated_at DESC);",
        kind: MigrationKind::Up,
    }]
}

pub fn register<R: tauri::Runtime>(builder: tauri::Builder<R>) -> tauri::Builder<R> {
    builder.plugin(
        tauri_plugin_sql::Builder::default()
            .add_migrations(DATABASE_URL, migrations())
            .build(),
    )
}

#[cfg(test)]
mod tests {
    use super::migrations;

    #[test]
    fn migration_versions_strictly_increase() {
        let versions: Vec<i64> = migrations().iter().map(|migration| migration.version).collect();
        assert!(versions.windows(2).all(|pair| pair[0] < pair[1]));
        assert_eq!(versions.first(), Some(&1));
    }
}
