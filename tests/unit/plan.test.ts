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

  test("an extension builds for the browser, not the desktop, and says so in its description", () => {
    const plan = normalizePlan({ ...base, base: "extension" }, catalog);
    expect(plan.profile).toBe("extension");
    expect(plan.targets).toEqual(["browser"]);
    expect(plan.description).toContain("browser extension");
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
    [{ base: "extension", ui: "konsta" }, /extension supports the shadcn interface kit only/u],
    [{ base: "extension", frontend: "nextjs" }, /extension supports the vite frontend only/u],
    [{ base: "extension", targets: ["android"] }, /cannot build for "android"/u],
    [{ base: "extension", modules: ["database"] }, /no extension implementation/u],
    [{ base: "electron", modules: ["side-panel"] }, /no electron implementation/u],
    [{ theme: { primary: "red; background: url(x)" } }, /theme.primary/u],
  ])("rejects %j", (override, message) => {
    expect(() => normalizePlan({ ...base, ...override }, catalog)).toThrow(message);
  });
});
