import { afterAll, beforeAll, expect, test } from "vitest";
import { type AppSession, startApp } from "./support/session";

let session: AppSession;

beforeAll(async () => {
  session = await startApp();
});

afterAll(async () => {
  await session?.stop();
});

test("creates and deletes a note in the local database", async () => {
  const { browser } = session;
  const title = `E2E note ${Date.now()}`;
  const input = await browser.$("#note-title");
  await input.waitForDisplayed({ timeout: 20_000 });
  await input.setValue(title);
  await (await browser.$("button=Add")).click();
  const item = await browser.$(`span=${title}`);
  await item.waitForDisplayed({ timeout: 10_000 });
  await (await browser.$(`button[aria-label="Delete ${title}"]`)).click();
  await item.waitForDisplayed({ reverse: true, timeout: 10_000 });
  expect(await browser.$(`span=${title}`).isExisting()).toBe(false);
});
