import { describe, expect, test } from "vitest";
import { handleMenuClick } from "./background";
import { lastSelectionSetting } from "./selection";

describe("context menu", () => {
  test("saves the selected text when the menu item is clicked", async () => {
    await handleMenuClick({ menuItemId: "send-selection", selectionText: "  hello world  " });
    expect(await lastSelectionSetting.getValue()).toBe("hello world");
  });

  test("limits very long selections", async () => {
    await handleMenuClick({ menuItemId: "send-selection", selectionText: "x".repeat(2000) });
    expect((await lastSelectionSetting.getValue()).length).toBe(500);
  });

  test("ignores other menu items and empty selections", async () => {
    await handleMenuClick({ menuItemId: "other", selectionText: "nope" });
    await handleMenuClick({ menuItemId: "send-selection" });
    expect(await lastSelectionSetting.getValue()).toBe("");
  });
});
