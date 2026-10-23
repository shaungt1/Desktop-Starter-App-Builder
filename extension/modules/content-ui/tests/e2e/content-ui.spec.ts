import { expect, test } from "./fixtures";

test("the overlay is mounted in a shadow root on matching pages and can be closed", async ({ context }) => {
  // Answer the request locally so the test needs no network access.
  await context.route("https://example.com/**", (route) =>
    route.fulfill({ contentType: "text/html", body: "<!doctype html><title>Example</title><h1>Example</h1>" }),
  );
  const page = await context.newPage();
  await page.goto("https://example.com/");

  const host = page.locator("__APP_SLUG__-overlay");
  await expect(host).toBeAttached();
  // Playwright's locators pierce open shadow roots.
  await expect(host.getByText("added to the page by the extension")).toBeVisible();
  await host.getByRole("button", { name: "Close" }).click();
  await expect(host.getByText("added to the page by the extension")).toBeHidden();
});
