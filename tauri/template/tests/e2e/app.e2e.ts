import { afterAll, beforeAll, expect, test } from "vitest";
import { APP_NAME } from "../../src/lib/app-identity";
import { type AppSession, startApp } from "./support/session";

let session: AppSession;

beforeAll(async () => {
  session = await startApp();
});

afterAll(async () => {
  await session?.stop();
});

test("opens the main window and talks to the Rust core", async () => {
  const { browser } = session;
  const heading = await browser.$("h1");
  await heading.waitForDisplayed({ timeout: 20_000 });
  expect(await heading.getText()).toBe(APP_NAME);
  const version = await browser.$('[data-testid="app-version"]');
  await version.waitForDisplayed({ timeout: 20_000 });
  expect(await version.getText()).toBe("__APP_VERSION__");
});

test("navigates to the settings screen", async () => {
  const { browser } = session;
  await browser.$('[data-nav="/settings"]').click();
  await browser.waitUntil(async () => (await browser.$("h1").getText()) === "Settings", { timeout: 20_000 });
});
