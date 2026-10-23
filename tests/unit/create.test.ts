/**
 * Generates every example plan into a temporary folder (without installing
 * packages) and checks the result: tokens replaced, registries written,
 * provenance recorded and the builder's own files never copied.
 */
import { afterAll, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createApp } from "../../cli/commands/create.ts";
import { loadCatalog } from "../../cli/lib/catalog.ts";
import { listFiles } from "../../cli/lib/files.ts";
import { BUILDER_ROOT } from "../../cli/lib/paths.ts";
import { readPlan } from "../../cli/lib/plan.ts";

const examples = path.join(BUILDER_ROOT, "plans", "examples");
const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "dsab-create-"));
afterAll(() => fs.rmSync(workspace, { recursive: true, force: true }));

describe("create", () => {
  for (const file of fs.readdirSync(examples).filter((name) => name.endsWith(".json"))) {
    test(`generates ${file}`, async () => {
      const plan = readPlan(path.join(examples, file), loadCatalog());
      const target = path.join(workspace, path.basename(file, ".json"));
      await createApp(target, plan, { install: false, verify: false });

      const files = listFiles(target);
      expect(files).toContain(".desktop-starter.json");
      expect(files).toContain("app.config.json");
      expect(files).not.toContain("start.sh");
      expect(files.some((name) => name.startsWith("cli/"))).toBe(false);

      // The bundled reference docs are copied verbatim (they describe placeholders), and
      // tauri-action fills its own __VERSION__ placeholder in the release workflow.
      expect(files).toContain("docs/README.md");
      expect(files).toContain("scripts/doctor.mjs");
      for (const name of files) {
        if (/\.(png|ico|icns)$/u.test(name) || name.startsWith("docs/") || name.startsWith("scripts/bootstrap"))
          continue;
        const content = fs.readFileSync(path.join(target, name), "utf8").replaceAll("__VERSION__", "");
        expect({ name, leftover: content.match(/__[A-Z_]+__/u)?.[0] }).toEqual({ name, leftover: undefined });
      }

      const provenance = JSON.parse(fs.readFileSync(path.join(target, ".desktop-starter.json"), "utf8"));
      expect(provenance.modules).toEqual(plan.modules);
      if (plan.base === "electron") {
        const registry = fs.readFileSync(path.join(target, "src/main/modules/registry.ts"), "utf8");
        for (const id of plan.modules) {
          expect(registry).toContain(`"./${id}"`);
        }
      } else if (plan.base === "extension") {
        const registry = fs.readFileSync(path.join(target, "src/modules/registry.ts"), "utf8");
        const permissions = JSON.parse(fs.readFileSync(path.join(target, "src/permissions.generated.json"), "utf8"));
        const catalog = loadCatalog();
        for (const id of plan.modules) {
          const implementation = catalog.modules.find((module) => module.id === id)?.implementations.extension;
          if (implementation?.backgroundModule) {
            expect(registry).toContain(`"./${id}/background"`);
          }
          expect(permissions.permissions).toEqual(expect.arrayContaining(implementation?.permissions ?? []));
        }
        expect(files).toContain("wxt.config.ts");
        expect(files).toContain("entrypoints/background.ts");
      } else {
        const rust = fs.readFileSync(path.join(target, "src-tauri/src/modules/mod.rs"), "utf8");
        expect(rust).toContain("tauri::generate_handler!");
      }
      expect(fs.existsSync(path.join(target, ".git"))).toBe(true);
    });
  }

  test("refuses a folder that already has project files", async () => {
    const target = path.join(workspace, "occupied");
    fs.mkdirSync(target, { recursive: true });
    fs.writeFileSync(path.join(target, "package.json"), "{}");
    const plan = readPlan(path.join(examples, "electron-native.json"), loadCatalog());
    await expect(createApp(target, plan, { install: false, verify: false })).rejects.toThrow(/not empty/u);
  });

  test("keeps the README and Git repository of a fresh GitHub repository", async () => {
    const target = path.join(workspace, "fresh-repo");
    fs.mkdirSync(path.join(target, ".git"), { recursive: true });
    fs.writeFileSync(path.join(target, "README.md"), "# Mine\n");
    const plan = readPlan(path.join(examples, "electron-native.json"), loadCatalog());
    await createApp(target, plan, { install: false, verify: false });
    expect(fs.readFileSync(path.join(target, "README.md"), "utf8")).toBe("# Mine\n");
  });

  test("refuses a target inside the builder", async () => {
    const plan = readPlan(path.join(examples, "electron-native.json"), loadCatalog());
    await expect(
      createApp(path.join(BUILDER_ROOT, "tmp-app"), plan, { install: false, verify: false }),
    ).rejects.toThrow(/outside the builder/u);
  });
});
