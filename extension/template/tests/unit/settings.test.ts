import { describe, expect, test } from "vitest";
import { enabledSetting, greetingSetting } from "@/src/lib/settings";

describe("settings", () => {
  test("have fallbacks, so reading never returns null", async () => {
    expect(await enabledSetting.getValue()).toBe(true);
    expect(await greetingSetting.getValue()).toContain("Hello");
  });

  test("persist a new value", async () => {
    await enabledSetting.setValue(false);
    expect(await enabledSetting.getValue()).toBe(false);
  });

  test("notify watchers when the value changes", async () => {
    const seen: boolean[] = [];
    const stop = enabledSetting.watch((value) => seen.push(value));
    await enabledSetting.setValue(false);
    stop();
    expect(seen).toContain(false);
  });
});
