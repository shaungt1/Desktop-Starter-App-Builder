import { describe, expect, test } from "bun:test";
import { loadCatalog } from "../../cli/lib/catalog.ts";
import { normalizePlan } from "../../cli/lib/plan.ts";

const catalog = loadCatalog();
const base = { name: "Acme Notes", slug: "acme-notes", appId: "com.acme.notes" };

describe("normalizePlan", () => {
  test("fills defaults", () => {
    const plan = normalizePlan(base, catalog);
    expect(plan.base).toBe("electron");
    expect(plan.profile).toBe("native");
    expect(plan.scheme).toBe("acmenotes");
    expect(plan.version).toBe("0.1.0");
    expect(plan.modules).toEqual([]);
  });

  test("adds required modules before the modules that need them", () => {
    const plan = normalizePlan(
      {
        ...base,
        modules: ["auth-oidc"],
        moduleOptions: { "auth-oidc": { issuer: "https://id.example.com", clientId: "c" } },
      },
      catalog,
    );
    expect(plan.modules).toEqual(["secure-storage", "auth-oidc"]);
  });

  test.each([
    [{ slug: "Bad Slug" }, /slug/u],
    [{ appId: "notreverse" }, /appId/u],
    [{ base: "flutter" }, /base must be/u],
    [{ profile: "remote" }, /remoteUrl/u],
    [{ profile: "remote", remoteUrl: "http://example.com" }, /https/u],
    [{ name: 'Quote"Name' }, /must not contain/u],
    [{ modules: ["nope"] }, /Unknown module/u],
    [{ modules: ["auth-oidc"] }, /issuer/u],
    [{ base: "tauri", modules: ["crash-reporting"] }, /no tauri implementation/u],
    [{ theme: { primary: "red; background: url(x)" } }, /theme.primary/u],
  ])("rejects %j", (override, message) => {
    expect(() => normalizePlan({ ...base, ...override }, catalog)).toThrow(message);
  });
});
