import { defineConfig } from "vitest/config";

// End-to-end tests drive the real app through WebDriver (tauri-driver).
// Run with `bun run test:e2e`, which builds a debug binary first.
export default defineConfig({
  test: {
    include: ["tests/e2e/**/*.e2e.ts"],
    environment: "node",
    testTimeout: 60_000,
    hookTimeout: 120_000,
    fileParallelism: false,
  },
});
