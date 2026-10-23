import { defineConfig } from "@playwright/test";

// End-to-end tests drive the packaged app (run `bun run test:e2e`, which packages first).
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
});
