import { expect, test } from "@playwright/test";
import { launchPackagedApp } from "./support/launch";

test("creates and deletes a note in the local database", async () => {
  const app = await launchPackagedApp();
  try {
    const window = await app.firstWindow();
    const title = `E2E note ${Date.now()}`;
    await window.getByLabel("New note").fill(title);
    await window.getByRole("button", { name: "Add" }).click();
    await expect(window.getByText(title)).toBeVisible();
    await window.getByRole("button", { name: `Delete ${title}` }).click();
    await expect(window.getByText(title)).toHaveCount(0);
  } finally {
    await app.close();
  }
});
