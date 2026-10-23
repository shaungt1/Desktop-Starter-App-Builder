import { defineConfig } from "@playwright/test";

// End-to-end tests load the built extension (.output/chrome-mv3) into Chromium.
// Run `bun run test:e2e`, which builds first. Extensions need a persistent
// browser context, so the tests launch the browser themselves (tests/e2e/fixtures.ts).
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
});
