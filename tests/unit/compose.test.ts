import { describe, expect, test } from "bun:test";
import { camelCase, deepMerge, snakeCase } from "../../cli/lib/compose.ts";

describe("naming", () => {
  test("converts module ids", () => {
    expect(camelCase("auth-oidc")).toBe("authOidc");
    expect(snakeCase("secure-storage")).toBe("secure_storage");
  });
});

describe("deepMerge", () => {
  test("merges nested objects and unions arrays", () => {
    const merged = deepMerge(
      { bundle: { targets: "all", icon: ["a.png"] }, plugins: { a: { x: 1 } } },
      { bundle: { icon: ["a.png", "b.png"] }, plugins: { b: { y: 2 } } },
    );
    expect(merged).toEqual({
      bundle: { targets: "all", icon: ["a.png", "b.png"] },
      plugins: { a: { x: 1 }, b: { y: 2 } },
    });
  });
});
