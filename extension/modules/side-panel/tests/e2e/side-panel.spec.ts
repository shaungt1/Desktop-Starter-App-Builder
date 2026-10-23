import { expect, test } from "./fixtures";

test("the side panel page renders the saved greeting", async ({ context, extensionId }) => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/sidepanel.html`);
  await expect(page.getByText("Hello from __APP_NAME__")).toBeVisible();
});
