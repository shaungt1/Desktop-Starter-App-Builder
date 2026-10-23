import { defineConfig } from "vitest/config";
import { WxtVitest } from "wxt/testing/vitest-plugin";

// Unit tests run in Node with an in-memory copy of the browser extension APIs
// (fakeBrowser). A file that renders React starts with `// @vitest-environment jsdom`.
export default defineConfig({
  plugins: [WxtVitest()],
  test: {
    include: ["src/**/*.test.{ts,tsx}", "tests/unit/**/*.test.{ts,tsx}"],
    setupFiles: ["tests/unit/setup.ts"],
    globals: true,
    css: false,
  },
});
