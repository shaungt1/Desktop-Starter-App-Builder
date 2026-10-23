import { describe, expect, it, vi } from "vitest";
import { createNotesRepository, type SqlConnection } from "./notes-repository";

describe("notes repository", () => {
  it("uses parameterized SQL and maps rows", async () => {
    const connection: SqlConnection = {
      select: vi.fn(async () => [
        { id: 1, title: "First", body: "", created_at: "2026-01-01", updated_at: "2026-01-02" },
      ]) as SqlConnection["select"],
      execute: vi.fn(async () => ({ rowsAffected: 1 })),
    };
    const repository = createNotesRepository(async () => connection);

    await repository.create("  Hello  ", "body");
    expect(connection.execute).toHaveBeenCalledWith("INSERT INTO notes (title, body) VALUES ($1, $2)", [
      "Hello",
      "body",
    ]);
    expect(await repository.list()).toEqual([
      { id: 1, title: "First", body: "", createdAt: "2026-01-01", updatedAt: "2026-01-02" },
    ]);
    expect(await repository.remove(1)).toBe(true);
  });

  it("rejects empty titles before touching the database", async () => {
    const connect = vi.fn();
    const repository = createNotesRepository(connect);
    await expect(repository.create("   ")).rejects.toThrow(/Title/u);
    expect(connect).not.toHaveBeenCalled();
  });
});
