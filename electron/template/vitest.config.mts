import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Unit tests. Files ending in .test.tsx run in a simulated browser (jsdom);
// files ending in .test.ts run in Node (main-process logic).
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src/renderer"),
      electron: path.resolve(import.meta.dirname, "tests/unit/electron-stub.ts"),
    },
  },
  test: {
    include: ["src/**/*.test.{ts,tsx}", "tests/unit/**/*.test.{ts,tsx}"],
    environment: "node",
    setupFiles: ["tests/unit/setup.ts"],
    css: false,
  },
});
