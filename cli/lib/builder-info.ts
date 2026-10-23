/**
 * Identity of this builder checkout, recorded in every generated app.
 */
import path from "node:path";
import { capture } from "./exec.ts";
import { readJson } from "./files.ts";
import { BUILDER_ROOT } from "./paths.ts";

export async function builderIdentity(): Promise<{ name: string; version: string; commit?: string }> {
  const manifest = readJson<{ name: string; version: string }>(path.join(BUILDER_ROOT, "package.json"));
  const commit = await capture(["git", "rev-parse", "HEAD"], BUILDER_ROOT);
  return { name: manifest.name, version: manifest.version, commit };
}
