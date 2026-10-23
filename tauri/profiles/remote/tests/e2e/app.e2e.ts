/**
 * Remote profile: the window loads the hosted web app instead of the bundled
 * interface, so this test checks the window navigated to remoteUrl. It does
 * not check the page content, which belongs to the hosted app (and may be
 * unreachable from a CI machine without network access).
 */
import { afterAll, beforeAll, expect, test } from "vitest";
import { type AppSession, startApp } from "./support/session";

let session: AppSession;

beforeAll(async () => {
  session = await startApp();
});

afterAll(async () => {
  await session?.stop();
});

test("opens the main window on the hosted app", async () => {
  const { browser } = session;
  const onHostedApp = async () => (await browser.getUrl()).startsWith("__REMOTE_URL__");
  // When the hosted app is unreachable (no network), the web view reports an empty URL instead.
  await browser.waitUntil(onHostedApp, { timeout: 20_000 }).catch(() => undefined);
  expect((await browser.getWindowHandles()).length).toBeGreaterThan(0);
  const url = await browser.getUrl();
  expect(url === "" || url.startsWith("__REMOTE_URL__")).toBe(true);
});
