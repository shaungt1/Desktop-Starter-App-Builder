import { createRoot, type Root } from "react-dom/client";
import { Overlay } from "@/src/modules/content-ui/overlay";
import "@/src/styles/globals.css";

// A content script that mounts a React panel in a shadow root (WXT createShadowRootUi).
// Change `matches` to the sites the panel belongs on.
export default defineContentScript({
  matches: ["https://example.com/*"],
  cssInjectionMode: "ui",
  async main(ctx) {
    const ui = await createShadowRootUi<Root>(ctx, {
      name: "__APP_SLUG__-overlay",
      position: "inline",
      anchor: "body",
      onMount: (container) => {
        // The container is the page body; React warns about roots on <body>, so use a wrapper element.
        const wrapper = document.createElement("div");
        container.append(wrapper);
        const root = createRoot(wrapper);
        root.render(<Overlay />);
        return root;
      },
      onRemove: (root) => root?.unmount(),
    });
    ui.mount();
  },
});
