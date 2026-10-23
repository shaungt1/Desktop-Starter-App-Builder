import "@testing-library/jest-dom/vitest";
import { beforeEach } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";

// Every test starts with empty extension storage and no registered listeners.
beforeEach(() => {
  fakeBrowser.reset();
});
