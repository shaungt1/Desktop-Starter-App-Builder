import { listen } from "@/src/lib/messaging";
import { enabledModules } from "@/src/modules/registry";

// The background service worker. The browser starts it for events and stops it
// when idle, so keep no state in variables: use `src/lib/settings.ts` storage.
// Register every listener synchronously inside main(), or the worker cannot be
// woken for it after it has been stopped.
export default defineBackground(() => {
  listen({
    ping: ({ text }) => ({ reply: `Background received: ${text}`, receivedAt: Date.now() }),
  });

  for (const module of enabledModules) {
    module.setup();
  }
});
