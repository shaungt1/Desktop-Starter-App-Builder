/**
 * Typed client for the main process. `ipc.app.info()`, `ipc.theme.set(...)`
 * and every module's procedures are checked against the main-process router
 * at compile time.
 */
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/message-port";
import type { RouterClient } from "@orpc/server";
import type { AppRouter } from "../../main/ipc/router";

export type IpcClient = RouterClient<AppRouter>;

/** Message the preload script listens for; it forwards the attached port to the main process. */
const CONNECT_REQUEST = "dsab:connect";

function connect(): IpcClient {
  const { port1, port2 } = new MessageChannel();
  window.postMessage(CONNECT_REQUEST, window.location.origin === "null" ? "*" : window.location.origin, [port2]);
  port1.start();
  return createORPCClient(new RPCLink({ port: port1 }));
}

/**
 * Stand-in used where no window exists (the Next.js frontend pre-renders
 * pages at build time). Property access works so components can render;
 * calling a procedure rejects.
 */
function unavailable(path: string): unknown {
  return new Proxy(() => undefined, {
    get: (_target, key) => (key === "then" ? undefined : unavailable(`${path}.${String(key)}`)),
    apply: () => Promise.reject(new Error(`IPC is only available inside the app window (${path})`)),
  });
}

let client: IpcClient | undefined;

/** The client connects on first use rather than at import time, so importing it never needs a window. */
export const ipc: IpcClient = new Proxy({} as IpcClient, {
  get(_target, key) {
    if (typeof window === "undefined") {
      return unavailable(String(key));
    }
    client ??= connect();
    return client[key as keyof IpcClient];
  },
});
