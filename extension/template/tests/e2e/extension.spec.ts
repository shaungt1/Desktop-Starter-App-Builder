import { expect, test } from "./fixtures";

test("the popup asks the background worker and shows its reply", async ({ context, extensionId }) => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  await page.getByRole("button", { name: "Ask the background worker" }).click();
  await expect(page.getByTestId("reply")).toContainText("Background received:");
});

test("a setting saved on the options page is visible in the popup", async ({ context, extensionId }) => {
  const options = await context.newPage();
  await options.goto(`chrome-extension://${extensionId}/options.html`);
  await options.getByLabel("Greeting").fill("Saved from the options page");
  await options.getByRole("button", { name: "Save" }).click();
  await expect(options.getByRole("status")).toHaveText("Saved");

  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  await expect(popup.getByText("Saved from the options page")).toBeVisible();
});

test("the content script marks matching pages while the extension is enabled", async ({ context }) => {
  // Answer the request locally so the test needs no network access.
  await context.route("https://example.com/**", (route) =>
    route.fulfill({ contentType: "text/html", body: "<!doctype html><title>Example</title><h1>Example</h1>" }),
  );
  const page = await context.newPage();
  await page.goto("https://example.com/");
  await expect(page.locator("html")).toHaveAttribute("data-extension-active", "");
});
