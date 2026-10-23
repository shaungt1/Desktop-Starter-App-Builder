import { expect, test } from "@playwright/test";
import { launchPackagedApp } from "./support/launch";

test("starts the background worker", async () => {
  const app = await launchPackagedApp();
  try {
    const window = await app.firstWindow();
    await expect(window.getByText("Worker: running")).toBeVisible({ timeout: 15_000 });
  } finally {
    await app.close();
  }
});
