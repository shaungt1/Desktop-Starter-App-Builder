import path from "node:path";
import { describe, expect, it } from "vitest";
import { createGrantList } from "./granted-paths";

describe("grant list", () => {
  it("allows only files chosen in a dialog", () => {
    const grants = createGrantList();
    const chosen = grants.grant("/home/user/notes/todo.txt");
    expect(grants.assertGranted("/home/user/notes/../notes/todo.txt")).toBe(chosen);
    expect(() => grants.assertGranted(path.resolve("/home/user/.ssh/id_rsa"))).toThrow(/not chosen/u);
  });
});
