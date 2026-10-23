# Calling native code from the hosted web app (remote profile)

In the remote profile the window shows your hosted site. That site can call
the app's main-process procedures through the same typed bridge the bundled
interface uses, but only because its origin is listed as trusted
(`remoteUrl` and `allowedOrigins` in app.config.json). The main process checks
the page's origin on every connection and refuses anything else.

## How the hosted site connects

1. Detect the desktop app: the bridge exists only inside it.
2. Open a MessageChannel and post one end with the message `dsab:connect`.
3. Use an oRPC client on the other end.

```ts
// In the hosted web app (install @orpc/client in that project).
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/message-port";

export function connectDesktop() {
  const { port1, port2 } = new MessageChannel();
  window.postMessage("dsab:connect", window.location.origin, [port2]);
  port1.start();
  return createORPCClient(new RPCLink({ port: port1 }));
}
```

For full types, publish the desktop app's `AppRouter` type (src/main/ipc/router.ts)
to the web project, for example through a shared package in a monorepo.

When the page runs in a normal browser nothing answers the connection, so
treat calls as optional: wrap them in a timeout and fall back to web behavior.
