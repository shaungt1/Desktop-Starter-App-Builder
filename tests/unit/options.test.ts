import { afterAll, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { collectPlan } from "../../cli/commands/plan.ts";
import { loadCatalog } from "../../cli/lib/catalog.ts";
import { applyPackageManager } from "../../cli/lib/compose.ts";
import { formatJson } from "../../cli/lib/files.ts";
import { normalizePlan } from "../../cli/lib/plan.ts";

const catalog = loadCatalog();
const base = { name: "Acme Notes", slug: "acme-notes", appId: "com.acme.notes" };

describe("plan options: frontend, interface kit, package manager, targets", () => {
  test("defaults to Vite, shadcn/ui, Bun and desktop only", () => {
    const plan = normalizePlan(base, catalog);
    expect(plan.frontend).toBe("vite");
    expect(plan.ui).toBe("shadcn");
    expect(plan.uiTheme).toBeUndefined();
    expect(plan.packageManager).toBe("bun");
    expect(plan.targets).toEqual(["desktop"]);
  });

  test("Konsta UI defaults to the iOS look and accepts material", () => {
    expect(normalizePlan({ ...base, ui: "konsta" }, catalog).uiTheme).toBe("ios");
    expect(normalizePlan({ ...base, ui: "konsta", uiTheme: "material" }, catalog).uiTheme).toBe("material");
  });

  test("Tauri may add Android and iOS; desktop is always kept", () => {
    const plan = normalizePlan({ ...base, base: "tauri", targets: ["android"], modules: ["database"] }, catalog);
    expect(plan.targets).toEqual(["desktop", "android"]);
  });

  test("accepts targets and modules written as comma-separated text", () => {
    const plan = normalizePlan({ ...base, base: "tauri", targets: "desktop, android", modules: "database" }, catalog);
    expect(plan.targets).toEqual(["desktop", "android"]);
    expect(plan.modules).toEqual(["database"]);
  });

  test("collects module options from --option flags", () => {
    const raw = collectPlan({
      name: "Acme Notes",
      base: "electron",
      profile: "native",
      frontend: "vite",
      ui: "shadcn",
      "package-manager": "bun",
      modules: "auth-oidc",
      option: ["auth-oidc.issuer=https://id.example.com", "auth-oidc.clientId=desktop-app"],
    });
    expect(raw.moduleOptions).toEqual({ "auth-oidc": { issuer: "https://id.example.com", clientId: "desktop-app" } });
  });

  test.each([
    [{ base: "tauri", targets: ["android"], appId: "com.acme.my-app", modules: ["database"] }, /Android package name/u],
    [{ frontend: "svelte" }, /frontend must be one of/u],
    [{ frontend: "nextjs", profile: "exported" }, /native profile only/u],
    [{ ui: "konsta", uiTheme: "windows" }, /uiTheme must be one of/u],
    [{ packageManager: "yarn" }, /packageManager must be one of/u],
    [{ targets: ["android"] }, /electron cannot build for "android"/u],
    [{ base: "tauri", targets: ["ios"], modules: ["background"] }, /desktop-only/u],
    [{ base: "tauri", targets: ["android"], profile: "remote", remoteUrl: "https://example.com" }, /native profile/u],
  ])("rejects %p", (patch, message) => {
    expect(() => normalizePlan({ ...base, ...patch }, catalog)).toThrow(message);
  });
});

describe("formatJson", () => {
  test("keeps short arrays of plain values on one line and expands objects", () => {
    expect(formatJson({ a: [1, 2], b: { c: true } })).toBe('{\n  "a": [1, 2],\n  "b": {\n    "c": true\n  }\n}');
  });

  test("expands every array when asked (package.json style)", () => {
    expect(formatJson({ a: ["x"] }, 0, 0, true)).toBe('{\n  "a": [\n    "x"\n  ]\n}');
  });
});

describe("applyPackageManager", () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "dsab-pm-"));
  afterAll(() => fs.rmSync(folder, { recursive: true, force: true }));

  test("rewrites Bun commands and drops Bun-only workflow steps for npm", () => {
    fs.writeFileSync(
      path.join(folder, "package.json"),
      JSON.stringify({
        scripts: { verify: "bun run lint", doctor: "bun scripts/doctor.mjs" },
        trustedDependencies: ["x"],
      }),
    );
    fs.mkdirSync(path.join(folder, ".github"), { recursive: true });
    fs.writeFileSync(
      path.join(folder, ".github/ci.yml"),
      "      - uses: oven-sh/setup-bun@v2 # @bun-only\n      - run: bun install --frozen-lockfile\n",
    );
    fs.writeFileSync(path.join(folder, "bunfig.toml"), "");
    applyPackageManager("npm", folder, ["package.json", ".github/ci.yml"]);

    const manifest = JSON.parse(fs.readFileSync(path.join(folder, "package.json"), "utf8"));
    expect(manifest.scripts).toEqual({ verify: "npm run lint", doctor: "node scripts/doctor.mjs" });
    expect(manifest.trustedDependencies).toBeUndefined();
    expect(fs.readFileSync(path.join(folder, ".github/ci.yml"), "utf8")).toBe("      - run: npm ci\n");
    expect(fs.existsSync(path.join(folder, "bunfig.toml"))).toBe(false);
  });

  test("keeps Bun steps and removes only the marker for Bun", () => {
    fs.writeFileSync(path.join(folder, "ci.yml"), "      - uses: oven-sh/setup-bun@v2 # @bun-only\n");
    applyPackageManager("bun", folder, ["ci.yml"]);
    expect(fs.readFileSync(path.join(folder, "ci.yml"), "utf8")).toBe("      - uses: oven-sh/setup-bun@v2\n");
  });
});
