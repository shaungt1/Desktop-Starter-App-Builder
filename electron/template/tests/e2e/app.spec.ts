/**
 * Launches the packaged app and checks the interface loads, reaches the
 * main process over IPC and navigates between screens.
 */
import { expect, test } from "@playwright/test";
import { APP_NAME } from "../../src/renderer/lib/app-identity";
import { launchPackagedApp } from "./support/launch";

test("opens the main window and talks to the main process", async () => {
  const app = await launchPackagedApp();
  try {
    const window = await app.firstWindow();
    await expect(window.locator("h1")).toHaveText(APP_NAME);
    await expect(window.getByTestId("app-version")).toHaveText("__APP_VERSION__");
    await window.locator('[data-nav="/settings"]').click();
    await expect(window.locator("h1")).toHaveText("Settings");
  } finally {
    await app.close();
  }
});
