/**
 * Starts the debug build of the app under tauri-driver and returns a
 * WebdriverIO browser for it.
 *
 * Requirements (see docs/TESTING.md in the builder):
 * - tauri-driver on PATH: `cargo install tauri-driver --locked`
 * - Linux: WebKitWebDriver (`sudo apt install webkit2gtk-driver`); run headless with `xvfb-run`.
 * - Windows: msedgedriver.exe matching the installed Edge/WebView2 version on PATH.
 * - macOS: not supported by tauri-driver; use the WebdriverIO Tauri service instead.
 */
import { type ChildProcess, spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { remote } from "webdriverio";

const DRIVER_PORT = 4444;

function waitForPort(port: number, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const socket = net.connect(port, "127.0.0.1");
      socket.once("connect", () => {
        socket.end();
        resolve();
      });
      socket.once("error", () => {
        socket.destroy();
        if (Date.now() > deadline) {
          reject(new Error(`tauri-driver did not open port ${port}`));
        } else {
          setTimeout(attempt, 200);
        }
      });
    };
    attempt();
  });
}

export interface AppSession {
  browser: WebdriverIO.Browser;
  stop: () => Promise<void>;
}

export async function startApp(): Promise<AppSession> {
  const executable = process.platform === "win32" ? "__APP_SLUG__.exe" : "__APP_SLUG__";
  // Cargo writes to CARGO_TARGET_DIR when it is set, otherwise to src-tauri/target.
  const targetDir = process.env.CARGO_TARGET_DIR ?? path.join("src-tauri", "target");
  const application = path.resolve(targetDir, "debug", executable);
  const driver: ChildProcess = spawn("tauri-driver", ["--port", String(DRIVER_PORT)], { stdio: "inherit" });
  try {
    await waitForPort(DRIVER_PORT, 15_000);
    const browser = await remote({
      hostname: "127.0.0.1",
      port: DRIVER_PORT,
      logLevel: "warn",
      capabilities: { "tauri:options": { application } } as WebdriverIO.Capabilities,
    });
    return {
      browser,
      stop: async () => {
        await browser.deleteSession().catch(() => undefined);
        driver.kill();
      },
    };
  } catch (error) {
    driver.kill();
    throw error;
  }
}
