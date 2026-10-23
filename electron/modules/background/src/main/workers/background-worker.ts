/**
 * Background worker: runs in its own Node process (Electron utilityProcess),
 * so long work never blocks the window. It keeps running while the window is
 * hidden. Replace the heartbeat with real work (sync, indexing, an agent loop).
 *
 * Messages in:  { type: "ping" }
 * Messages out: { type: "heartbeat", ticks, uptimeSeconds } every 10 seconds, and in reply to "ping".
 */
const HEARTBEAT_MS = 10_000;
let ticks = 0;

const port = process.parentPort;

function report(): void {
  port.postMessage({ type: "heartbeat", ticks, uptimeSeconds: Math.round(process.uptime()) });
}

setInterval(() => {
  ticks += 1;
  report();
}, HEARTBEAT_MS);

port.on("message", (event: { data: unknown }) => {
  if ((event.data as { type?: string } | null)?.type === "ping") {
    report();
  }
});
