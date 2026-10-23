import { enabledSetting } from "@/src/lib/settings";

// A content script runs inside matching web pages, in an isolated JavaScript
// world: it can read and change the page's DOM but cannot see the page's own
// variables. Change `matches` to the sites your extension works on, and keep it
// as narrow as possible: it decides which sites the browser warns users about.
export default defineContentScript({
  matches: ["https://example.com/*"],
  async main() {
    const mark = (active: boolean) => {
      document.documentElement.toggleAttribute("data-extension-active", active);
    };
    mark(await enabledSetting.getValue());
    enabledSetting.watch(mark);
  },
});
