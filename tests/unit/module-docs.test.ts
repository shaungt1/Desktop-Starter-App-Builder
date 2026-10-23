import { expect, test } from "bun:test";
import fs from "node:fs";
import { MODULES_DOC, renderModuleDocs } from "../../scripts/generate-module-docs.ts";

test("docs/MODULES.md matches config/catalog.json (run `bun run docs:modules`)", () => {
  expect(fs.readFileSync(MODULES_DOC, "utf8")).toBe(renderModuleDocs());
});
