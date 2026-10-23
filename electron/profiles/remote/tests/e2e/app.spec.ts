/**
 * Launches the packaged app. The window either shows the hosted site or,
 * when it is unreachable (for example in CI), the bundled offline screen.
 */
import { expect, test } from "@playwright/test";
import { launchPackagedApp } from "./support/launch";

test("loads the hosted app or the offline screen", async () => {
  const app = await launchPackagedApp();
  try {
    const window = await app.firstWindow();
    const showsExpectedPage = () => {
      const url = window.url();
      return url.startsWith("__REMOTE_URL__") || url.endsWith("#/offline");
    };
    await expect.poll(showsExpectedPage, { timeout: 20_000 }).toBe(true);
  } finally {
    await app.close();
  }
});
