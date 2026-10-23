/**
 * Launches the packaged app and checks the bundled static export is served
 * through the app:// scheme.
 */
import { expect, test } from "@playwright/test";
import { APP_NAME } from "../../src/renderer/lib/app-identity";
import { launchPackagedApp } from "./support/launch";

test("serves the static export", async () => {
  const app = await launchPackagedApp();
  try {
    const window = await app.firstWindow();
    await expect(window).toHaveURL(/^app:\/\/bundle\//u);
    await expect(window.locator("h1")).toHaveText(APP_NAME);
  } finally {
    await app.close();
  }
});
