import { describe, expect, it } from "vitest";
import { migrate, openDatabase } from "./database";
import { createNotesRepository } from "./notes-repository";

describe("database", () => {
  it("migrates a new database and stores notes", () => {
    const db = openDatabase(":memory:");
    const notes = createNotesRepository(db);
    const created = notes.create("First", "hello");
    expect(created.id).toBeGreaterThan(0);
    expect(notes.list().map((note) => note.title)).toEqual(["First"]);
    expect(notes.remove(created.id)).toBe(true);
    expect(notes.list()).toEqual([]);
    db.close();
  });

  it("rolls back a failing migration and reports it", () => {
    const db = openDatabase(":memory:");
    expect(() => migrate(db, [{ version: 2, name: "broken", sql: "CREATE TABLE x (; " }])).toThrow(/Migration 2/u);
    const { user_version } = db.prepare("PRAGMA user_version").get() as { user_version: number };
    expect(user_version).toBe(1);
    db.close();
  });
});
