/**
 * Connects renderers to the procedure router.
 *
 * The renderer creates a MessageChannel and sends one end through the
 * preload script. Here the main process checks which page sent it and only
 * then attaches the oRPC handler to that port. Pages from untrusted origins
 * never get a connection.
 */
import { RPCHandler } from "@orpc/server/message-port";
import { BrowserWindow, ipcMain } from "electron";
import { logger } from "../logger";
import { isTrustedUrl } from "../security";
import { router } from "./router";

/** Channel name shared with src/preload/preload.ts. */
export const IPC_PORT_CHANNEL = "dsab:ipc-port";

export function startIpcServer(trustedOrigins: () => readonly string[]): void {
  const handler = new RPCHandler(router);

  ipcMain.on(IPC_PORT_CHANNEL, (event) => {
    const [port] = event.ports;
    const senderUrl = event.senderFrame?.url ?? "";
    if (!port) {
      return;
    }
    if (!isTrustedUrl(senderUrl, trustedOrigins())) {
      logger.warn(`Refused IPC connection from untrusted page: ${senderUrl}`);
      port.close();
      return;
    }
    handler.upgrade(port, {
      context: { window: BrowserWindow.fromWebContents(event.sender) },
    });
    port.start();
  });
}
