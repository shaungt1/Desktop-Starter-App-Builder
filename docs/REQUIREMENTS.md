# Requirements: what a developer's machine needs

This page is the checklist to give a developer, or an AI agent, who is about to
use Desktop Starter App Builder for the first time. It states exactly which tools
must be installed, at which version, for each kind of project the builder can
create, and it points to the script that installs them and the command that proves
the machine is ready. The long, step-by-step version with every package name per
operating system is [`SETUP_RESOURCES.md`](SETUP_RESOURCES.md); this page is the
short version to read first.

The builder creates three kinds of project, called **bases**: an **Electron**
desktop app, a **Tauri 2** desktop app (which can also build Android and iOS apps),
and a **browser extension** built with WXT. The tools you need depend on the base,
so install only what the base you will use asks for.

## Three ways to prepare a machine

Pick one. All three end with the same check, so the result is identical.

1. **Ask an agent** (Claude Code, Codex, GitHub Copilot or any agent in VS Code that can run shell commands). Open this repository, and paste the prompt in [`prompts/setup-machine.md`](../prompts/setup-machine.md). The agent runs the read-only check, shows you what is missing, asks before installing anything, runs the install script, and re-checks.
2. **Run the script yourself.** `bash start.sh bootstrap --base <electron|tauri|extension>` detects Windows (in Git Bash), macOS or Linux, prints a plan of what is missing, asks, and installs only that. Add `--dry-run` first to see the plan without changing anything. `scripts/bootstrap.ps1` does the same for people who prefer PowerShell.
3. **Install by hand.** Follow the commands in "Install commands by operating system" below, or the longer [`SETUP_RESOURCES.md`](SETUP_RESOURCES.md).

## What each base needs

The table below lists every tool, the minimum version the builder checks for, and
which bases need it. A dash means the base does not need it. The minimums are the
ones the `doctor` and bootstrap scripts enforce, and a unit test keeps this table
and those scripts in agreement.

| Tool | Minimum | Electron | Tauri 2 | Browser extension |
| --- | --- | --- | --- | --- |
| Git | any current | yes | yes | yes |
| Bun | 1.3.0 | yes | yes | yes |
| Node.js | 22.17.0 | yes | — | yes |
| Rust (through rustup) and Cargo | 1.90.0 | — | yes | — |
| Operating-system build tools: Visual Studio C++ Build Tools and WebView2 (Windows), Xcode Command Line Tools (macOS), WebKitGTK 4.1 development packages (Linux) | current | — | yes | — |
| `dpkg`, `fakeroot` (and `rpm`) for Linux installers | any | Linux only | — | — |

Bun is the package manager and script runner the builder and its generated apps use
by default. A project created with `--package-manager npm` uses Node.js and npm
instead of Bun; the builder itself always needs Bun.

Some work needs extra tools that the table above does not include. They are only
needed for that work, and the bootstrap script adds them when you pass the flag in
the first column.

| Flag | Adds | For |
| --- | --- | --- |
| `--e2e` | `tauri-driver`; on Windows an `msedgedriver.exe` whose major version equals the installed Microsoft Edge; on Debian and Ubuntu `webkit2gtk-driver` and `xvfb` | End-to-end tests of Tauri apps |
| `--mobile` | Android Studio with the SDK and NDK, `JAVA_HOME`, `ANDROID_HOME`, `NDK_HOME`, the Rust Android targets; on a Mac also Xcode, CocoaPods and the Rust iOS targets | Tauri apps that target Android or iOS |
| (none) | Chromium for Playwright, downloaded by the project itself when you run `bun run test:e2e` | End-to-end tests of browser extensions |

Electron end-to-end tests need no extra tool on Windows and macOS; on a Linux
machine with no display, run them under `xvfb-run -a`. Browser extension
end-to-end tests run Chromium without a window, so they need no display.

## Install commands by operating system

The commands below install the tools in the table above. Each block is for one
operating system and covers all three bases; skip the lines for bases you will not
use. After installing, **open a new terminal window** so the new tools are on the
PATH (the list of folders the terminal searches for programs).

### Windows 10 and 11 (Git Bash)

Install Git first from [git-scm.com](https://git-scm.com/install/windows) or with
winget (Windows' package manager); it includes Git Bash, the shell this builder
recommends on Windows. Then run:

```bash
winget install --id Git.Git -e --source winget
winget install --id Oven-sh.Bun -e --source winget
winget install --id OpenJS.NodeJS.LTS -e --source winget          # Electron and extension; skip if you use nvm-windows: nvm install 22.17.0 && nvm use 22.17.0
winget install --id Rustlang.Rustup -e --source winget            # Tauri
rustup default stable-msvc                                        # Tauri
winget install --id Microsoft.VisualStudio.BuildTools -e --source winget --override "--wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"   # Tauri
```

WebView2 is already part of Windows 10 version 1803 and later and of Windows 11. The
easier route is `bash start.sh bootstrap --base tauri`, which runs these commands
after showing them to you and asking.

### macOS

```bash
xcode-select --install                                            # Git and Apple's compiler tools (Tauri)
brew install bun node git                                         # Bun, Node.js (Electron and extension), Git
brew install rustup && rustup default stable                      # Tauri
```

Homebrew is installed from [brew.sh](https://brew.sh). On a Mac, run the builder
with `bash start.sh`. Building and running iOS apps also needs the full Xcode app from the Mac App Store.

### Linux (Debian and Ubuntu; Fedora and Arch are in `SETUP_RESOURCES.md`)

```bash
sudo apt install -y git curl unzip build-essential
curl -fsSL https://bun.com/install | bash
# Node.js 22.17 or newer (Electron and extension): the bootstrap script installs the official binary into ~/.local/node
sudo apt install -y dpkg fakeroot rpm                              # Electron, for .deb and .rpm installers
sudo apt install -y libwebkit2gtk-4.1-dev libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev libdbus-1-dev pkg-config wget file   # Tauri
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh   # Tauri
```

## Prove the machine is ready

`doctor` only looks; it never installs. Run it for the base you will use, from the
builder folder:

```bash
bash start.sh doctor --base electron
bash start.sh doctor --base tauri --e2e
bash start.sh doctor --base extension
```

Every line reads `ok`, `missing` or `too old`, with the exact fix printed under
anything that is not `ok`. The check passes when the last line reads
`All required tools are present.` Inside a generated project the same check is
`bun run doctor` (or `npm run doctor`), and it reads the base from the project's
`project-plan.json`.

## What you need to ship, not to build

Building and testing need only the tools above. Releasing to users needs accounts
and credentials that only the product's owner can create. No script or agent can
create them, and the builder never publishes, signs or submits anything without the
owner's explicit approval for that release. The table lists what each base needs.

| Account or credential | Base | What it is for | Where it is explained |
| --- | --- | --- | --- |
| GitHub repository and Actions secrets | all | CI and release workflows; secrets hold every credential below | the project's `.github/workflows/` |
| Windows code-signing certificate (or Azure Artifact Signing) | Electron, Tauri | Removes the Windows SmartScreen warning on installers | `docs/electron/03-signing.md`, `docs/tauri/11-signing.md` |
| Apple Developer Program membership | Electron, Tauri (macOS, iOS) | Signing, notarizing and distributing Mac apps; the App Store | the same signing pages |
| Google Play Console account and an Android keystore | Tauri (Android) | Publishing Android apps | `docs/tauri/13-distribution-stores.md` |
| Microsoft Partner Center account | Electron, Tauri (Microsoft Store); extension (Edge Add-ons) | Store distribution | the stores pages |
| Tauri updater key pair | Tauri | Signed automatic updates | `docs/tauri/11-signing.md` |
| Chrome Web Store developer account | extension | Publishing to Chrome | `docs/extension/07-publishing-and-stores.md` |
| Firefox Add-ons (AMO) account and API keys | extension | Publishing to Firefox | the same page |

## Optional extras

Docker is not required for any of this. The image in `docker/` exists for building
Linux and Android artifacts on a machine without installing the toolchains, and for
running the builder's own tests in a clean room; [`DOCKER.md`](DOCKER.md) says when
it helps. The GitHub command-line tool (`gh`) is useful for creating the repository
and reading CI results but is never required.

## If something fails

Run `doctor` and read the `fix:` line under the first item that is not `ok`; it
names the exact command. For install errors, a tool that is installed but not
found, a `too old` Node.js on a machine that uses a version manager, or a PATH that
did not refresh, see [`TROUBLESHOOTING.md`](TROUBLESHOOTING.md).
