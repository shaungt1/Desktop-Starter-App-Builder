/**
 * Preload script: the only code that can talk to both the page and the main
 * process. It exposes nothing to the page. It only forwards the one
 * MessagePort the page sends to open the typed IPC connection; the main
 * process then checks the page's origin before accepting it.
 */
import { ipcRenderer } from "electron";

const CONNECT_REQUEST = "dsab:connect";
const IPC_PORT_CHANNEL = "dsab:ipc-port";

window.addEventListener("message", (event) => {
  if (event.source !== window || event.data !== CONNECT_REQUEST) {
    return;
  }
  const [port] = event.ports;
  if (port) {
    ipcRenderer.postMessage(IPC_PORT_CHANNEL, null, [port]);
  }
});
