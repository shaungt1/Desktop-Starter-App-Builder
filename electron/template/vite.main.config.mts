import path from "node:path";
import { defineConfig } from "vite";

// Main process bundle. Electron and Node built-ins stay external.
// node:sqlite is listed explicitly because it exists only with the node: prefix
// and is missing from the built-in module list some tools use.
export default defineConfig({
  resolve: { alias: { "@main": path.resolve(import.meta.dirname, "src/main") } },
  build: { rollupOptions: { external: ["node:sqlite"] } },
});
