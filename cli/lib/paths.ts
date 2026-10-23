/**
 * Well-known locations inside the builder repository.
 */
import path from "node:path";

/** Absolute path of the builder repository root (the folder that holds start.sh). */
export const BUILDER_ROOT = path.resolve(import.meta.dir, "..", "..");

export const CONFIG_DIR = path.join(BUILDER_ROOT, "config");
export const CATALOG_FILE = path.join(CONFIG_DIR, "catalog.json");
export const SOURCES_FILE = path.join(CONFIG_DIR, "sources.json");
export const SHARED_DIR = path.join(BUILDER_ROOT, "shared");
export const CACHE_DIR = path.join(BUILDER_ROOT, ".cache");

/** Name of the provenance file written into every generated application. */
export const PROVENANCE_FILE = ".desktop-starter.json";

export function fromBuilder(relative: string): string {
  return path.join(BUILDER_ROOT, relative);
}
