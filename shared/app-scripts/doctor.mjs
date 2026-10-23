#!/usr/bin/env node
/**
 * Read-only check of this machine for building the app. It never installs
 * anything; each missing tool is printed with the command that fixes it, and
 * scripts/bootstrap.sh (macOS, Linux) or scripts/bootstrap.ps1 (Windows)
 * installs them for you.
 *
 * Usage (runs on Node.js 22+ or Bun):
 *   node scripts/doctor.mjs [--base electron|tauri|extension] [--mobile] [--e2e]
 *
 * Inside a generated app the base and mobile targets are read from
 * project-plan.json, so `bun run doctor` / `npm run doctor` needs no options.
 * The same file is used by the builder's `doctor` command.
 *
 * Exit code: 0 when every required tool is present, 1 otherwise.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const args = process.argv.slice(2);
const option = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};

/** project-plan.json in the current folder, when this runs inside a generated app. */
function readPlan() {
  try {
    return JSON.parse(fs.readFileSync(path.join(process.cwd(), "project-plan.json"), "utf8"));
  } catch {
    return undefined;
  }
}

const plan = readPlan();
const base = option("--base") ?? plan?.base;
const targets = plan?.targets ?? ["desktop"];
// Apps generated for npm run their scripts with Node.js; the builder and Bun apps need Bun.
const packageManager = plan?.packageManager ?? "bun";
const wantAndroid = args.includes("--mobile") || targets.includes("android");
const wantIos = args.includes("--mobile") || targets.includes("ios");
const wantE2e = args.includes("--e2e");
if (base && base !== "electron" && base !== "tauri" && base !== "extension") {
  console.error("--base must be electron, tauri or extension");
  process.exit(2);
}

/**
 * Runs a program and returns its trimmed output, or undefined when it is
 * missing or fails. On Windows, programs found on PATH run through the shell
 * so .cmd and .ps1 shims (for example a Bun installed with npm) are found.
 */
function capture(command, commandArgs = []) {
  const options = { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] };
  try {
    if (process.platform === "win32" && !/[\\/]/u.test(command)) {
      return execFileSync([command, ...commandArgs].join(" "), { ...options, shell: true }).trim();
    }
    return execFileSync(command, commandArgs, options).trim();
  } catch {
    return undefined;
  }
}

const firstLine = (text) => text?.split(/\r?\n/u)[0];

/** Compares dotted version numbers found in `text` with `minimum`; true when text is at least minimum. */
function atLeast(text, minimum) {
  const found = text?.match(/(\d+)\.(\d+)(?:\.(\d+))?/u);
  if (!found) {
    return false;
  }
  const have = found.slice(1).map((part) => Number(part ?? 0));
  const need = minimum.split(".").map(Number);
  for (let index = 0; index < 3; index += 1) {
    if ((have[index] ?? 0) !== (need[index] ?? 0)) {
      return (have[index] ?? 0) > (need[index] ?? 0);
    }
  }
  return true;
}

const directory = (value) => (value && fs.existsSync(value) ? value : undefined);
const platform = process.platform;

/**
 * Each check: name, which bases need it ("all", "electron", "tauri", "extension"), whether
 * it is optional, a probe returning what was found, an optional minimum
 * version, and the fix to print.
 */
const checks = [
  {
    name: "Bun",
    needs: packageManager === "bun" ? ["all"] : ["none"],
    minimum: "1.3.0",
    probe: () => firstLine(capture("bun", ["--version"])),
    fix: 'Windows: powershell -c "irm bun.sh/install.ps1|iex"   macOS/Linux: curl -fsSL https://bun.com/install | bash',
  },
  {
    name: "Node.js",
    needs: packageManager === "npm" ? ["all"] : ["electron", "extension"],
    minimum: "22.17.0",
    probe: () => firstLine(capture("node", ["--version"])),
    fix: "Install Node.js 22.17 or newer (Windows: winget install OpenJS.NodeJS.LTS; macOS: brew install node).",
  },
  {
    name: "Git",
    needs: ["all"],
    probe: () => firstLine(capture("git", ["--version"])),
    fix: "Windows: winget install Git.Git   macOS: xcode-select --install   Linux: sudo apt install git",
  },
  {
    name: "Rust compiler (rustc)",
    needs: ["tauri"],
    minimum: "1.90.0",
    probe: () => firstLine(capture("rustc", ["--version"])),
    fix: "Install or update Rust with rustup: rustup update stable (first install: https://rustup.rs).",
  },
  {
    name: "Cargo",
    needs: ["tauri"],
    probe: () => firstLine(capture("cargo", ["--version"])),
    fix: "Cargo ships with rustup.",
  },
];

if (platform === "linux") {
  checks.push(
    {
      name: "WebKitGTK 4.1 development files",
      needs: ["tauri"],
      probe: () => capture("pkg-config", ["--modversion", "webkit2gtk-4.1"]),
      fix: "Debian/Ubuntu: sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev libdbus-1-dev pkg-config",
    },
    {
      name: "dpkg and fakeroot (Linux .deb installers)",
      needs: ["electron"],
      probe: () => (capture("dpkg", ["--version"]) && capture("fakeroot", ["-v"]) ? "installed" : undefined),
      fix: "Debian/Ubuntu: sudo apt install dpkg fakeroot",
    },
  );
}
if (platform === "darwin") {
  checks.push({
    name: "Xcode Command Line Tools",
    needs: ["tauri"],
    probe: () => capture("xcode-select", ["-p"]),
    fix: "xcode-select --install",
  });
}
if (platform === "win32") {
  const webView2Key = "Microsoft\\EdgeUpdate\\Clients\\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}";
  checks.push(
    {
      name: "WebView2 runtime",
      needs: ["tauri"],
      probe: () =>
        capture("reg", ["query", `HKLM\\SOFTWARE\\WOW6432Node\\${webView2Key}`, "/v", "pv"]) ||
        capture("reg", ["query", `HKCU\\Software\\${webView2Key}`, "/v", "pv"])
          ? "installed"
          : undefined,
      fix: "Included in Windows 10 1803+ and Windows 11; otherwise: winget install Microsoft.EdgeWebView2Runtime",
    },
    {
      name: "Visual Studio C++ Build Tools",
      needs: ["tauri"],
      probe: () =>
        firstLine(
          capture(
            `${process.env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)"}\\Microsoft Visual Studio\\Installer\\vswhere.exe`,
            [
              "-products",
              "*",
              "-requires",
              "Microsoft.VisualStudio.Component.VC.Tools.x86.x64",
              "-property",
              "displayName",
            ],
          ),
        ),
      fix: 'Install "Desktop development with C++" from Visual Studio Build Tools (scripts/bootstrap.ps1 does this).',
    },
  );
}

/** Windows: the installed Microsoft Edge version (product version of msedge.exe), or undefined. */
function edgeVersion() {
  const roots = [process.env["ProgramFiles(x86)"], process.env.ProgramFiles].filter(Boolean);
  for (const root of roots) {
    const exe = `${root}\\Microsoft\\Edge\\Application\\msedge.exe`;
    if (!fs.existsSync(exe)) {
      continue;
    }
    const command = `(Get-Item '${exe}').VersionInfo.ProductVersion`;
    try {
      const powershell = `${process.env.SystemRoot ?? "C:\\Windows"}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`;
      return execFileSync(powershell, ["-NoProfile", "-Command", command], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
    } catch {
      return undefined;
    }
  }
  return undefined;
}

if (wantE2e) {
  checks.push({
    name: "tauri-driver (end-to-end tests)",
    needs: ["tauri"],
    probe: () => (capture("tauri-driver", ["--help"]) !== undefined ? "installed" : undefined),
    fix: "cargo install tauri-driver --locked",
  });
  if (platform === "win32") {
    checks.push({
      name: "msedgedriver matching Microsoft Edge (end-to-end tests)",
      needs: ["tauri"],
      minimum: undefined,
      probe: () => {
        const driver = firstLine(capture("msedgedriver", ["--version"]));
        const edge = edgeVersion();
        if (!driver) {
          return undefined;
        }
        const driverMajor = driver.match(/(\d+)\./u)?.[1];
        if (edge && driverMajor !== edge.split(".")[0]) {
          return undefined;
        }
        return `${driver.split(" (")[0]} (Edge ${edge ?? "not found"})`;
      },
      fix: "bash scripts/bootstrap.sh --base tauri --e2e downloads the driver that matches your Edge version.",
    });
  }
  if (platform === "linux") {
    checks.push({
      name: "WebKitWebDriver and Xvfb (end-to-end tests)",
      needs: ["tauri"],
      probe: () => (capture("which", ["WebKitWebDriver"]) && capture("which", ["xvfb-run"]) ? "installed" : undefined),
      fix: "Debian/Ubuntu: sudo apt install webkit2gtk-driver xvfb",
    });
  }
}

const rustTargets = () => capture("rustup", ["target", "list", "--installed"]) ?? "";

if (wantAndroid) {
  const androidHome = process.env.ANDROID_HOME;
  checks.push(
    {
      name: "JAVA_HOME (Android builds)",
      needs: ["tauri"],
      probe: () => directory(process.env.JAVA_HOME),
      fix: "Set JAVA_HOME to Android Studio's bundled JDK (docs/tauri/14-mobile.md lists the path per OS).",
    },
    {
      name: "ANDROID_HOME (Android SDK)",
      needs: ["tauri"],
      probe: () => directory(androidHome),
      fix: "Install Android Studio and the SDK, then set ANDROID_HOME (docs/SETUP_RESOURCES.md).",
    },
    {
      name: "NDK_HOME (Android NDK)",
      needs: ["tauri"],
      probe: () => directory(process.env.NDK_HOME),
      fix: "Install the NDK from Android Studio's SDK Manager, then set NDK_HOME to $ANDROID_HOME/ndk/<version>.",
    },
    {
      name: "Rust Android targets",
      needs: ["tauri"],
      probe: () => (rustTargets().includes("aarch64-linux-android") ? "installed" : undefined),
      fix: "rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android",
    },
  );
}
if (wantIos && platform === "darwin") {
  checks.push(
    {
      name: "Xcode (iOS builds)",
      needs: ["tauri"],
      probe: () => firstLine(capture("xcodebuild", ["-version"])),
      fix: "Install Xcode from the Mac App Store, then open it once to finish setup.",
    },
    {
      name: "CocoaPods (iOS builds)",
      needs: ["tauri"],
      probe: () => capture("pod", ["--version"]),
      fix: "brew install cocoapods",
    },
    {
      name: "Rust iOS targets",
      needs: ["tauri"],
      probe: () => (rustTargets().includes("aarch64-apple-ios") ? "installed" : undefined),
      fix: "rustup target add aarch64-apple-ios x86_64-apple-ios aarch64-apple-ios-sim",
    },
  );
} else if (wantIos) {
  console.log("note     iOS apps can only be built on macOS; skipping iOS checks on this machine.");
}

console.log(`Host check (${platform}/${os.arch()})${base ? ` for ${base}` : ""}`);
let missing = 0;
for (const check of checks) {
  const required = check.needs.includes("all") || (base !== undefined && check.needs.includes(base));
  const relevant = required || base === undefined;
  if (!relevant) {
    continue;
  }
  const found = check.probe();
  const tooOld = found && check.minimum && !atLeast(found, check.minimum);
  if (found && !tooOld) {
    console.log(`ok       ${check.name}: ${found}`);
    continue;
  }
  console.log(tooOld ? `too old  ${check.name}: ${found} (need ${check.minimum} or newer)` : `missing  ${check.name}`);
  console.log(`         fix: ${check.fix}`);
  if (required) {
    missing += 1;
  }
}
if (!base) {
  console.log("Pass --base electron, --base tauri or --base extension to fail on the tools that base requires.");
}
if (missing > 0) {
  console.log(
    `${missing} required tool(s) missing or too old. scripts/bootstrap.sh or scripts/bootstrap.ps1 installs them.`,
  );
  process.exit(1);
}
console.log("All required tools are present.");
