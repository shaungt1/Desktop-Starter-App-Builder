import path from "node:path";
import { type BrowserContext, test as base, chromium } from "@playwright/test";

const extensionPath = path.resolve(import.meta.dirname, "../../.output/chrome-mv3");

/**
 * Playwright fixtures that start Chromium with the built extension loaded.
 * Extensions only load in a persistent context; `channel: "chromium"` makes the
 * bundled Chromium run them in headless mode too (playwright.dev/docs/chrome-extensions).
 */
export const test = base.extend<{ context: BrowserContext; extensionId: string }>({
  // biome-ignore lint/correctness/noEmptyPattern: Playwright requires this exact parameter shape.
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext("", {
      channel: "chromium",
      args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
    });
    await use(context);
    await context.close();
  },
  extensionId: async ({ context }, use) => {
    // The service worker's URL is chrome-extension://<id>/background.js.
    let [worker] = context.serviceWorkers();
    worker ??= await context.waitForEvent("serviceworker");
    await use(worker.url().split("/")[2] ?? "");
  },
});

export const expect = test.expect;
