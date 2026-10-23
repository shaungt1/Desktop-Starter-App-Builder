/**
 * Keeps config/catalog.json consistent with the files on disk, so a module
 * entry can never point at code that does not exist.
 */
import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { BASE_IDS, loadCatalog } from "../../cli/lib/catalog.ts";
import { camelCase } from "../../cli/lib/compose.ts";
import { listFiles } from "../../cli/lib/files.ts";
import { BUILDER_ROOT } from "../../cli/lib/paths.ts";

const catalog = loadCatalog();
const ids = catalog.modules.map((module) => module.id);

describe("catalog", () => {
  test("module ids are unique kebab-case", () => {
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(/^[a-z]+(?:-[a-z]+)*$/u);
    }
  });

  test("requires and conflicts name real modules", () => {
    for (const module of catalog.modules) {
      for (const other of [...(module.requires ?? []), ...(module.conflicts ?? [])]) {
        expect(ids).toContain(other);
      }
    }
  });

  test("every base template and profile overlay exists", () => {
    for (const id of BASE_IDS) {
      const base = catalog.bases[id];
      expect(fs.existsSync(path.join(BUILDER_ROOT, base.template))).toBe(true);
      expect(base.profiles[base.defaultProfile]).toBeDefined();
      for (const profile of Object.values(base.profiles)) {
        if (profile.overlay) {
          expect(fs.existsSync(path.join(BUILDER_ROOT, profile.overlay))).toBe(true);
        }
      }
    }
  });

  test("manual-only modules have steps and no implementations", () => {
    for (const module of catalog.modules.filter((entry) => entry.manualOnly)) {
      expect(module.manualSteps?.length ?? 0).toBeGreaterThan(0);
      expect(Object.keys(module.implementations)).toEqual([]);
    }
  });

  for (const module of catalog.modules.filter((entry) => !entry.manualOnly)) {
    describe(module.id, () => {
      const electron = module.implementations.electron;
      const tauri = module.implementations.tauri;

      if (electron) {
        test("electron files match the declared entry points", () => {
          const files = listFiles(path.join(BUILDER_ROOT, electron.overlay));
          expect(files.includes(`src/main/modules/${module.id}/index.ts`)).toBe(Boolean(electron.mainModule));
          expect(files.includes(`src/renderer/features/${module.id}/index.tsx`)).toBe(
            Boolean(electron.rendererFeature),
          );
        });
        test("electron main module id matches", () => {
          if (!electron.mainModule) return;
          const source = fs.readFileSync(
            path.join(BUILDER_ROOT, electron.overlay, `src/main/modules/${module.id}/index.ts`),
            "utf8",
          );
          expect(source).toContain(`id: "${module.id}"`);
          expect(camelCase(module.id)).toMatch(/^[a-z][A-Za-z]*$/u);
        });
      }

      if (tauri) {
        test("tauri rust module declares every listed command", () => {
          const files = listFiles(path.join(BUILDER_ROOT, tauri.overlay));
          expect(files.includes(`src/features/${module.id}/index.tsx`)).toBe(Boolean(tauri.rendererFeature));
          if (!tauri.rustModule) return;
          const source = fs.readFileSync(
            path.join(BUILDER_ROOT, tauri.overlay, `src-tauri/src/modules/${tauri.rustModule}.rs`),
            "utf8",
          );
          expect(source).toContain("pub fn register<");
          if (tauri.rustSetup) {
            expect(source).toContain("pub fn setup<");
          }
          for (const command of tauri.commands ?? []) {
            expect(source).toMatch(new RegExp(`#\\[tauri::command\\]\\s+pub (async )?fn ${command}\\b`, "u"));
          }
        });
      }
    });
  }
});
