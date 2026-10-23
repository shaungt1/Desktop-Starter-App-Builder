# Setup resources

Source pages:
- https://github.com/tauri-apps/tauri-docs, local clone at commit `11934e365dfe`: `src/content/docs/start/prerequisites.mdx` (published as https://v2.tauri.app/start/prerequisites/), `src/content/docs/develop/Tests/WebDriver/index.mdx` (https://v2.tauri.app/develop/tests/webdriver/), `src/content/docs/develop/Tests/WebDriver/manual-setup.mdx` (https://v2.tauri.app/develop/tests/webdriver/manual-setup/), `src/content/docs/develop/Tests/WebDriver/ci.md` (https://v2.tauri.app/develop/tests/webdriver/ci/), `src/content/docs/distribute/debian.mdx` (https://v2.tauri.app/distribute/debian/)
- https://github.com/electron/forge, local clone at commit `16d47dc29387`: `package.json` (`engines.node`), `packages/api/cli/package.json`
- https://github.com/electron-forge/electron-forge-docs, local clone at commit `494fe76a3943`: `config/makers/deb.md`, `config/makers/rpm.md`
- https://github.com/tauri-apps/plugins-workspace, local clone at commit `df594206ce03`: `.github/workflows/test-android.yml` (Java version used in CI)
- https://github.com/tauri-apps/tauri-action, local clone at commit `a6e90ddc4ba4`: `.github/workflows/test-action.yml` (Java version used in CI)
- https://github.com/microsoft/winget-pkgs, treeless clone at commit `f7a8de2f769b` (2026-10-22): the `manifests/` folders named in the winget table below
- The Desktop Starter App Builder repository: `cli/commands/doctor.ts`, `start.sh`, `start.ps1`, `docs/TESTING.md`
- Opened in this session: https://bun.com/docs/installation, https://bun.com/install (the installer script itself), https://bun.sh/install.ps1, https://rustup.rs, https://www.rust-lang.org/tools/install, https://nodejs.org/en/download, https://nodejs.org/dist/latest-v24.x/SHASUMS256.txt, https://git-scm.com/install/windows, https://git-scm.com/install/mac, https://git-scm.com/install/linux, https://visualstudio.microsoft.com/visual-cpp-build-tools/, https://learn.microsoft.com/en-us/visualstudio/install/workload-component-id-vs-build-tools, https://learn.microsoft.com/en-us/visualstudio/install/use-command-line-parameters-to-install-visual-studio, https://learn.microsoft.com/en-us/windows/package-manager/winget/install, https://developer.microsoft.com/en-us/microsoft-edge/webview2/, https://developer.microsoft.com/en-us/microsoft-edge/tools/webdriver/, https://developer.android.com/studio, https://brew.sh, https://developer.apple.com/xcode/resources/, https://cocoapods.org, https://formulae.brew.sh/formula/bun, https://formulae.brew.sh/formula/node, https://formulae.brew.sh/formula/git, https://formulae.brew.sh/formula/rustup, https://formulae.brew.sh/formula/cocoapods, https://formulae.brew.sh/cask/android-studio, https://packages.fedoraproject.org/pkgs/dpkg/dpkg/, https://packages.fedoraproject.org/pkgs/fakeroot/fakeroot/, https://packages.fedoraproject.org/pkgs/rpm/rpm-build/, https://packages.fedoraproject.org/pkgs/nodejs24/nodejs24/, https://archlinux.org/packages/extra/x86_64/dpkg/, https://archlinux.org/packages/extra/x86_64/rpm-tools/, https://archlinux.org/packages/core/x86_64/fakeroot/, https://archlinux.org/packages/extra/x86_64/nodejs/
- Package availability on Ubuntu 24.04 checked locally with `apt-cache policy` and `dpkg -c`
- `rustup-init --help` output (rustup 1.28.2), for the `-y` and `--no-modify-path` options

Verified on 2026-10-22

## What this page is for

This page lists every tool a computer needs before Desktop Starter App Builder can generate, run and package apps. The builder is a command-line program (a program you run by typing commands in a terminal) that creates desktop apps from a project plan. It can create three kinds of project, called **bases**:

- An **Electron** app bundles its own copy of the Chromium browser engine and the Node.js JavaScript runtime. It is packaged with **Electron Forge**, a command-line tool that builds installers.
- A **Tauri** app has a backend written in Rust (a compiled programming language) and draws its interface with the web view (the built-in browser component) that the operating system already provides. Tauri apps can optionally also target Android and iOS phones.
- A **browser extension** is a small add-on for Chrome, Edge or Firefox, built with the **WXT** framework (an extension build tool that runs on Node.js). It needs no native compiler and no installer.

The page has four parts. It first gives an overview table of the tools. It then gives step-by-step instructions for Windows, macOS and Linux that can be followed from top to bottom. Next it describes the environment variables that mobile builds need. Finally it shows how to check the machine with the builder's `doctor` command and how the two bootstrap scripts automate all of the steps. Every command is shown exactly as it is typed, with the operating system it applies to.

## Terms used on this page

The following terms appear throughout the page, so they are defined once here.

- **Terminal**: the window where commands are typed. On Windows this page uses **PowerShell** (Microsoft's command shell) or **Git Bash** (a Bash shell installed with Git); on macOS and Linux it uses the default shell, usually Bash or Zsh.
- **Package manager**: a program that downloads and installs other programs. **winget** (the Windows Package Manager) is used on Windows, **Homebrew** (`brew`) on macOS, and on Linux **apt** (Debian and Ubuntu), **dnf** (Fedora) or **pacman** (Arch Linux).
- **Package ID**: the exact name a package manager uses for a program, such as `Git.Git` for winget.
- **`sudo`**: a Linux and macOS command that runs another command with administrator rights. It asks for your password.
- **PATH**: the list of folders the terminal searches for programs. A newly installed program is only found after its folder is on the PATH, which usually means opening a new terminal.
- **Environment variable**: a named setting that programs read, such as `JAVA_HOME`.
- **Shell profile**: a file the shell runs every time it starts (for example `~/.zshrc` or `~/.bashrc`). Lines added there set the PATH and environment variables permanently.
- **Toolchain** and **target**: in Rust, a toolchain is a compiler version, and a target is a platform the compiler can build for (for example Android on 64-bit ARM processors).
- **SDK** (software development kit) and **NDK** (native development kit): Google's libraries and compilers for building Android apps; the NDK is the part that compiles native (non-Java) code such as Rust.
- **JDK** (Java Development Kit): the Java compiler and runtime that Android's build system, Gradle, needs.
- **End-to-end (e2e) test**: an automated test that launches the real app and clicks through it. For Tauri this uses **WebDriver**, a standard protocol for remote-controlling a browser engine, through a helper program called `tauri-driver`.

## Overview of the tools

The table below lists each tool, which base needs it, and why. "Both" means both Electron and Tauri. "Tauri mobile" means only Tauri apps that target Android or iOS. "E2E" means only for end-to-end tests.

| Tool | Needed for | Minimum version | Why it is needed |
| --- | --- | --- | --- |
| Bun | Both | 1.3 | JavaScript runtime and package manager. It runs the builder (`cli/main.ts`) and installs packages and runs scripts in generated apps. The builder's `package.json` declares `"bun": ">=1.3.0"`. |
| Git | Both | Any current release | Version control. The builder's `create` command initializes a Git repository in each new app. On Windows it also provides Git Bash for `bash start.sh`. |
| Node.js | Electron, browser extension | 22.17 | Electron Forge's command-line tool runs on Node.js. Forge's root `package.json` declares `"node": ">= 22.17.0"` (its CLI package alone declares `>= 22.13.0`). |
| `dpkg` and `fakeroot` | Electron, building Linux `.deb` installers | Any | Forge's deb maker "can only build the deb target on Linux or macOS machines with the `fakeroot` and `dpkg` packages installed". |
| `rpm` / `rpm-build` | Electron, building Linux `.rpm` installers | Any | Forge's RPM maker "can only build the RPM target on Linux machines with the `rpm` or `rpm-build` packages installed". |
| Rust, installed through rustup | Tauri | stable 1.90 | Compiles the Tauri backend. rustup is the official installer and version manager for Rust. The official Tauri plugins declare a minimum Rust version of 1.90. |
| Microsoft C++ Build Tools ("Desktop development with C++") | Tauri on Windows | Current | The Microsoft compiler and linker that Rust uses on Windows (the "MSVC" toolchain). |
| Microsoft Edge WebView2 runtime | Tauri on Windows | Current | The web view Tauri uses on Windows. The Tauri docs state it is already installed on Windows 10 version 1803 and later. |
| Xcode Command Line Tools | Tauri on macOS | Current; macOS 10.15 or later | Apple's compiler and linker, used by Rust on macOS. They also provide Git. |
| WebKitGTK 4.1 and related libraries | Tauri on Linux | WebKitGTK 4.1 | The web view and system libraries Tauri links against on Linux. Package names differ per distribution (listed below). |
| Android Studio, with Android SDK Platform, Platform-Tools, NDK (Side by side), Build-Tools and Command-line Tools | Tauri mobile (Android) | Current | Google's Android IDE (integrated development environment); its SDK Manager installs the SDK and NDK. |
| JDK | Tauri mobile (Android) | See "Java" below | Needed by the Android build. The Tauri docs point `JAVA_HOME` at the JDK bundled inside Android Studio. |
| Rust Android targets | Tauri mobile (Android) | Same as Rust | Let Rust compile for Android processors. |
| Xcode (the full app, not only the Command Line Tools) | Tauri mobile (iOS), macOS only | Current | Apple's IDE and iOS SDK. |
| Homebrew | Tauri mobile (iOS); optional elsewhere on macOS | Current | The Tauri docs install CocoaPods with it; this page also uses it for Node.js on macOS. |
| CocoaPods | Tauri mobile (iOS) | Current | A dependency manager for iOS libraries, required by the Tauri iOS setup. |
| Rust iOS targets | Tauri mobile (iOS) | Same as Rust | Let Rust compile for iPhones and the iOS simulator. |
| `tauri-driver` | E2E, Tauri on Windows and Linux | Latest | Bridges WebDriver test tools to the Tauri app. |
| `webkit2gtk-driver` (provides `WebKitWebDriver`) | E2E, Tauri on Linux | Same as WebKitGTK | The native WebDriver server for WebKitGTK, which `tauri-driver` drives. |
| `xvfb` | E2E on Linux without a display | Any | A virtual display, used through `xvfb-run`, so tests run on servers and in containers. |
| `msedgedriver.exe` | E2E, Tauri on Windows | Must match the installed Edge version | The native WebDriver server for WebView2. The bootstrap scripts download the matching version automatically (see "Automating the steps"). |
| Chromium for Playwright | E2E, browser extension | Installed by the project | The browser the extension tests load the built extension into. `bun run test:e2e` downloads it (about 200 MB, once) with `playwright install chromium`; no separate step is needed. |

The table shows that a machine for Electron apps or browser extensions needs only Bun, Git and Node.js (plus the Linux packaging tools on Linux for Electron), while a machine for Tauri apps needs Bun, Git, Rust and the operating system's native build tools. Mobile and end-to-end tools are only needed when you use those features.

### Java

The Tauri prerequisites page does not name a JDK version. It sets `JAVA_HOME` to the JDK bundled with Android Studio (the `jbr` folder), so installing Android Studio is sufficient. The version of that bundled JDK was not checked in this session (**UNVERIFIED**). For reference, the official Tauri CI workflows install Eclipse Temurin JDK **21** (`actions/setup-java` with `java-version: 21` in `plugins-workspace/.github/workflows/test-android.yml` and `tauri-action/.github/workflows/test-action.yml`), so JDK 21 is a known-working choice if you install a separate JDK.

## Official download pages

The list below gives the official page for each tool. Each link was opened in this session and confirmed to be the intended page, except where a page is named without a link.

- Bun: https://bun.com/docs/installation
- Git: https://git-scm.com/install/windows, https://git-scm.com/install/mac, https://git-scm.com/install/linux
- Node.js: https://nodejs.org/en/download (on 2026-10-22 it listed v24.22.1 as the latest LTS, meaning long-term support release, and v26.12.1 as the latest release)
- Rust (rustup): https://rustup.rs and https://www.rust-lang.org/tools/install
- Microsoft C++ Build Tools: https://visualstudio.microsoft.com/visual-cpp-build-tools/
- WebView2 runtime ("Evergreen Bootstrapper" in the download section): https://developer.microsoft.com/en-us/microsoft-edge/webview2/
- Xcode and Apple developer downloads: https://developer.apple.com/xcode/resources/
- Homebrew: https://brew.sh
- Android Studio and the command-line tools: https://developer.android.com/studio (on 2026-10-22: Android Studio Rabbit 1, 2026.2.1)
- CocoaPods: https://cocoapods.org
- Microsoft Edge WebDriver: https://developer.microsoft.com/en-us/microsoft-edge/tools/webdriver/
- `tauri-driver`: the crates.io page for `tauri-driver` (the fetch was refused by the site, so no link is given)

These pages are the place to look when a command below stops working, because vendors occasionally change installers.

## Package IDs used on this page

The table below lists every package-manager ID used on this page and in the bootstrap scripts, and how each was verified. The winget IDs were read from the `PackageIdentifier` field of the manifests in the winget-pkgs repository; the Homebrew names from formulae.brew.sh; the Fedora and Arch names from the distributions' package sites; and the apt names from the Tauri and Forge docs plus `apt-cache policy` on Ubuntu 24.04.

| Manager | ID or name | Tool | Verified |
| --- | --- | --- | --- |
| winget | `Oven-sh.Bun` | Bun (1.4.4 in the repository) | Yes, manifest |
| winget | `Git.Git` | Git for Windows | Yes, manifest and git-scm.com |
| winget | `OpenJS.NodeJS.LTS` | Node.js LTS (24.22.1) | Yes, manifest |
| winget | `Rustlang.Rustup` | rustup | Yes, manifest and Tauri docs |
| winget | `Microsoft.VisualStudio.BuildTools` | Visual Studio Build Tools 2026 (18.x) | Yes, manifest |
| winget | `Microsoft.VisualStudio.2022.BuildTools` | Visual Studio Build Tools 2022 (17.x), alternative | Yes, manifest |
| winget | `Microsoft.EdgeWebView2Runtime` | WebView2 runtime | Yes, manifest |
| winget | `Google.AndroidStudio` | Android Studio | Yes, manifest |
| winget | `EclipseAdoptium.Temurin.21.JDK` | Temurin JDK 21 (optional) | Yes, manifest |
| Homebrew | `bun` | Bun | Yes |
| Homebrew | `node` | Node.js (26.12.1) | Yes |
| Homebrew | `git` | Git | Yes |
| Homebrew | `rustup` (alternative to the official script) | rustup | Yes |
| Homebrew | `cocoapods` | CocoaPods | Yes, and Tauri docs |
| Homebrew cask | `android-studio` | Android Studio | Yes |
| apt | `libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev` | Tauri system libraries | Yes, Tauri docs |
| apt | `libdbus-1-dev pkg-config` | D-Bus headers for the builder's secure-storage module | From `cli/commands/doctor.ts`; present on Ubuntu 24.04 |
| apt | `dpkg fakeroot rpm` | Electron Linux installers | Yes, Forge docs; `rpm` ships `/usr/bin/rpmbuild` on Ubuntu 24.04 |
| apt | `webkit2gtk-driver xvfb` | Tauri e2e on Linux | Yes, Tauri WebDriver docs; `webkit2gtk-driver` ships `/usr/bin/WebKitWebDriver` |
| apt | `git unzip curl` | Git, Bun installer prerequisite | Yes, git-scm.com and Bun docs |
| dnf | `webkit2gtk4.1-devel openssl-devel curl wget file libappindicator-gtk3-devel librsvg2-devel libxdo-devel` and group `c-development` | Tauri system libraries | Yes, Tauri docs |
| dnf | `rpm-build dpkg fakeroot` | Electron Linux installers | Yes, Forge docs and packages.fedoraproject.org (Fedora 43 and 44) |
| pacman | `webkit2gtk-4.1 base-devel curl wget file openssl appmenu-gtk-module libappindicator-gtk3 librsvg xdotool` | Tauri system libraries | Yes, Tauri docs |
| pacman | `dpkg rpm-tools fakeroot` | Electron Linux installers | Yes, archlinux.org (extra, extra, core) |
| pacman | `nodejs` | Node.js (26.12.0) | Yes, archlinux.org |

The table makes clear which names are safe to type as written. The only names on this page that are not in it are the Linux e2e packages for Fedora and Arch, which are **UNVERIFIED** and therefore not given.

## Windows 10 and 11, step by step

These steps prepare a Windows machine. The `winget` commands work the same in **Git Bash** (the recommended shell for this builder) and in **PowerShell**; the few PowerShell-only lines are marked, and `bash start.sh bootstrap` in Git Bash runs all of these steps for you. Each `winget install` adds the program's folder to the PATH itself, so **open a new terminal window after the installs** before checking versions. Bun requires Windows 10 version 1809 or later (stated on Bun's installation page and enforced by its installer).

1. **Check that winget exists.** Type `winget --version`. If the command is not found, install Microsoft's "App Installer" from the Microsoft Store, which provides winget (**UNVERIFIED**: the Store page was not opened in this session).

2. **Install Git** (this also installs Git Bash). The command below is the one git-scm.com shows; the page notes the winget package is not maintained by the Git for Windows project itself.

   ```powershell
   # Windows (PowerShell)
   winget install --id Git.Git -e --source winget
   ```

3. **Install Bun**, either with winget or with Bun's official PowerShell installer as shown on Bun's installation page.

   ```powershell
   # Windows (PowerShell), option A: winget
   winget install --id Oven-sh.Bun -e --source winget
   ```

   ```powershell
   # Windows (PowerShell), option B: Bun's official installer
   powershell -c "irm bun.sh/install.ps1|iex"
   ```

   An existing Bun older than 1.3 is updated with `bun upgrade`.

4. **For Electron apps: install Node.js** (the LTS package is 24.x, which satisfies the 22.17 minimum).

   ```powershell
   # Windows (PowerShell)
   winget install --id OpenJS.NodeJS.LTS -e --source winget
   ```

5. **For Tauri apps: install the Microsoft C++ Build Tools with the "Desktop development with C++" workload.** In the Build Tools installer that workload's ID is `Microsoft.VisualStudio.Workload.VCTools`. The builder's `doctor` command looks for the component `Microsoft.VisualStudio.Component.VC.Tools.x86.x64`, which Microsoft lists as a *recommended* (not required) part of that workload, so `--includeRecommended` must be passed. winget's `--override` option passes a string "directly to the installer"; `--wait` makes the Visual Studio installer wait until it finishes and `--passive` shows progress without asking questions. The install asks for administrator rights.

   ```powershell
   # Windows (PowerShell)
   winget install --id Microsoft.VisualStudio.BuildTools -e --source winget --override "--wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
   ```

   `Microsoft.VisualStudio.BuildTools` is Build Tools 2026; `Microsoft.VisualStudio.2022.BuildTools` installs the 2022 edition and takes the same override. Microsoft's workload page covers "Visual Studio 2022 and later", but the component names it lists were shown for 17.x (2022); that they are identical in 2026 is **UNVERIFIED**, so run the `doctor` check afterwards. Alternatively, download "Download Build Tools" from the C++ Build Tools page and tick "Desktop development with C++" during installation, as the Tauri docs describe. If Visual Studio is already installed without C++, open the Visual Studio Installer, choose **Modify**, and tick that workload instead.

6. **For Tauri apps: make sure WebView2 is present.** It is preinstalled on Windows 10 version 1803 and later according to the Tauri docs. If it is missing, install it:

   ```powershell
   # Windows (PowerShell)
   winget install --id Microsoft.EdgeWebView2Runtime -e --source winget
   ```

   Building `.msi` installers also needs the optional Windows feature **VBSCRIPT** (Settings, Apps, Optional features, More Windows features). The Tauri docs say it is enabled by default on most systems.

7. **For Tauri apps: install Rust through rustup** and make the MSVC toolchain the default, as the Tauri docs require. The rustup.rs page alternatively offers `rustup-init.exe` downloads for 64-bit, 32-bit and ARM Windows.

   ```powershell
   # Windows (PowerShell)
   winget install --id Rustlang.Rustup
   rustup default stable-msvc
   ```

   An older Rust is updated with `rustup update`.

8. **For Tauri Android apps: install Android Studio**, then follow the Android steps under "Mobile tooling" below.

   ```powershell
   # Windows (PowerShell)
   winget install --id Google.AndroidStudio -e --source winget
   ```

9. **For Tauri end-to-end tests:** install `tauri-driver` and an Edge WebDriver whose major version matches your Edge version. `bash start.sh bootstrap --base tauri --e2e` does both: it reads Edge's version from `msedge.exe`, downloads `https://msedgedriver.microsoft.com/<Edge version>/edgedriver_win64.zip` (verified to return the matching driver on 2026-10-23) and puts `msedgedriver.exe` next to `tauri-driver` in `~/.cargo/bin`. By hand, the Tauri docs download the matching driver with a small tool; `msedgedriver.exe` must be on the PATH (or passed to `tauri-driver` with `--native-driver`).

   ```powershell
   # Windows (PowerShell)
   cargo install tauri-driver --locked
   cargo install --git https://github.com/chippers/msedgedriver-tool
   & "$HOME/.cargo/bin/msedgedriver-tool.exe"
   ```

After these steps a Windows machine has everything the chosen base needs. Run the builder with `bash start.sh ...` in Git Bash or `.\start.ps1 ...` in PowerShell; if PowerShell refuses to run scripts, allow local scripts once with `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

## macOS, step by step

These steps prepare a Mac. Run the commands in the Terminal app. Tauri supports macOS Catalina (10.15) and later; Bun requires macOS 13.0 or later.

1. **Install the Xcode Command Line Tools.** They provide the compiler, the linker and Git. A dialog opens; finish it before continuing.

   ```sh
   # macOS
   xcode-select --install
   ```

2. **Install Homebrew** if you will install Node.js or iOS tooling with it. This is the command shown on brew.sh; the script explains what it will do and pauses before doing it. At the end it prints the exact lines to add to your shell profile; follow them.

   ```sh
   # macOS
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

3. **Install Bun** with the official script from Bun's installation page (or `brew install bun`).

   ```sh
   # macOS
   curl -fsSL https://bun.com/install | bash
   ```

   As the installer's source shows, it adds `~/.bun/bin` to the PATH by appending two lines to `~/.zshrc` (Zsh) or to the first writable of `~/.bash_profile` and `~/.bashrc` (Bash). Open a new terminal afterwards.

4. **For Electron apps: install Node.js 22.17 or newer.** Homebrew's `node` formula is 26.12.1 on 2026-10-22. The Node.js download page also offers a macOS installer.

   ```sh
   # macOS
   brew install node
   ```

5. **For Tauri apps: install Rust** with the official rustup command (identical on rustup.rs and in the Tauri docs). It asks for confirmation before installing (its `-y` option skips the question).

   ```sh
   # macOS
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

   By default rustup configures the PATH in your shell profile (its `--no-modify-path` option turns this off); open a new terminal afterwards. Homebrew also has a `rustup` formula, but it is "keg-only" (not linked onto the PATH) and needs `"$(brew --prefix rustup)/bin"` added to the PATH by hand, so the official command is simpler.

6. **For Tauri iOS apps:** install the full Xcode from the Mac App Store and launch it once so it finishes setting up, then follow the iOS steps under "Mobile tooling" below.

7. **For Tauri Android apps:** install Android Studio, then follow the Android steps below.

   ```sh
   # macOS
   brew install --cask android-studio
   ```

8. **End-to-end tests on macOS:** the Tauri docs state that `tauri-driver` cannot be used on macOS because there is no WebDriver tool for macOS's web view (WKWebView). The documented alternative is the WebdriverIO Tauri service with its embedded WebDriver server, described in the builder's `docs/TESTING.md` (in a generated app: `docs/tauri/08-testing-debugging.md`).

After these steps a Mac has everything the chosen base needs.

## Linux, step by step

These steps cover the three distribution families on the Tauri prerequisites page that this builder supports directly: Debian and Ubuntu (apt), Fedora (dnf) and Arch Linux (pacman). Other distributions are listed in the Tauri reference page `01-prerequisites.md` (`tauri/docs/reference/` in the builder, `docs/tauri/` in a generated app). Every `sudo` command asks for your password. Tauri v2 needs WebKitGTK 4.1; the Tauri Debian packaging guide names Ubuntu 22.04 and Debian 12 as suitable baselines because they provide `libwebkit2gtk-4.1-dev` in their standard repositories.

### Step 1: Git, curl and unzip

Bun's installer needs `unzip` (Bun's installation page) and both the Bun and rustup installers download with `curl`.

```sh
# Debian / Ubuntu
sudo apt update
sudo apt install git curl unzip
```

```sh
# Fedora
sudo dnf install git curl unzip
```

```sh
# Arch Linux
sudo pacman -S --needed git curl unzip
```

### Step 2: Bun

The official command is the same as on macOS. It appends two PATH lines to the first writable of `~/.bash_profile` and `~/.bashrc` for Bash (or to `~/.zshrc` for Zsh); open a new terminal afterwards.

```sh
# Linux (all distributions)
curl -fsSL https://bun.com/install | bash
```

### Step 3: Node.js (Electron apps only)

Node.js 22.17 or newer is needed. Distribution packages differ in version, so check before using them: Arch's `nodejs` is 26.12.0, but Ubuntu 24.04's `nodejs` is 18.19.1 (checked with `apt-cache policy`), which is too old. Fedora ships versioned packages such as `nodejs24`; which package provides the plain `node` command on a given Fedora release was not checked (**UNVERIFIED**).

```sh
# Arch Linux
sudo pacman -S --needed nodejs
```

On Debian, Ubuntu and Fedora, the dependable source is the official Linux binary from nodejs.org. The Node.js 24 LTS files and their SHA-256 checksums are listed in https://nodejs.org/dist/latest-v24.x/SHASUMS256.txt (for example `node-v24.22.1-linux-x64.tar.gz` and `node-v24.22.1-linux-arm64.tar.gz`). The commands below download the x64 build, check its checksum, unpack it into `~/.local`, and create a stable `~/.local/node` link; use `linux-arm64` instead of `linux-x64` on ARM machines. The bootstrap script does exactly this and picks the newest 24.x file automatically.

```sh
# Linux (Debian, Ubuntu, Fedora), x64
cd /tmp
curl -fsSLO https://nodejs.org/dist/latest-v24.x/SHASUMS256.txt
FILE=$(grep -Eo 'node-v[0-9.]+-linux-x64\.tar\.gz' SHASUMS256.txt | head -n 1)
curl -fSLO "https://nodejs.org/dist/latest-v24.x/$FILE"
grep " $FILE\$" SHASUMS256.txt | sha256sum -c -
mkdir -p ~/.local && tar -xzf "$FILE" -C ~/.local
ln -sfn ~/.local/"${FILE%.tar.gz}" ~/.local/node
```

Then add this line to your shell profile (`~/.bashrc` for Bash) and open a new terminal:

```sh
export PATH="$HOME/.local/node/bin:$PATH"
```

### Step 4: Electron Linux installer tools (Electron apps only)

These packages let Electron Forge build `.deb` and `.rpm` installers. The Debian/Ubuntu and Fedora commands for the RPM tools come from Forge's RPM maker page.

```sh
# Debian / Ubuntu
sudo apt install dpkg fakeroot rpm
```

```sh
# Fedora
sudo dnf install rpm-build dpkg fakeroot
```

```sh
# Arch Linux
sudo pacman -S --needed dpkg rpm-tools fakeroot
```

### Step 5: Tauri system libraries (Tauri apps only)

These are the commands from the Tauri prerequisites page. The Debian/Ubuntu command additionally includes `libdbus-1-dev` and `pkg-config`, which the builder's `doctor` command lists for its secure-storage module; the matching Fedora and Arch package names were not checked (**UNVERIFIED**) and are therefore not added there.

```sh
# Debian / Ubuntu
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libxdo-dev \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  libdbus-1-dev \
  pkg-config
```

```sh
# Fedora
sudo dnf check-update
sudo dnf install webkit2gtk4.1-devel \
  openssl-devel \
  curl \
  wget \
  file \
  libappindicator-gtk3-devel \
  librsvg2-devel \
  libxdo-devel
sudo dnf group install "c-development"
```

```sh
# Arch Linux
sudo pacman -Syu
sudo pacman -S --needed \
  webkit2gtk-4.1 \
  base-devel \
  curl \
  wget \
  file \
  openssl \
  appmenu-gtk-module \
  libappindicator-gtk3 \
  librsvg \
  xdotool
```

### Step 6: Rust (Tauri apps only)

This is the official rustup command, as on macOS. Open a new terminal afterwards, or run `. "$HOME/.cargo/env"` in the current one.

```sh
# Linux (all distributions)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### Step 7: Android Studio (Tauri Android apps only)

Neither winget nor Homebrew applies on Linux. Download the Linux `.tar.gz` (for example `android-studio-rabbit1-linux.tar.gz`) from https://developer.android.com/studio. The Tauri docs set `JAVA_HOME=/opt/android-studio/jbr`, which implies Android Studio is unpacked into `/opt/android-studio`; the command below does that. That Android Studio is then started with `bin/studio.sh` is **UNVERIFIED** in this session, because the installation section of Google's install page did not load.

```sh
# Linux, from the folder containing the download
sudo tar -xzf android-studio-*-linux.tar.gz -C /opt
/opt/android-studio/bin/studio.sh
```

Then follow the Android steps under "Mobile tooling" below.

### Step 8: End-to-end test tools

Tauri's WebDriver docs install `tauri-driver` with Cargo and, on Debian-based systems, the `webkit2gtk-driver` package (which provides `WebKitWebDriver`) and `xvfb` (which provides `xvfb-run`). The equivalent Fedora and Arch packages were not checked (**UNVERIFIED**); on those systems, check with `which WebKitWebDriver` and `which xvfb-run`.

```sh
# Debian / Ubuntu
sudo apt install webkit2gtk-driver xvfb
cargo install tauri-driver --locked
```

Electron end-to-end tests also need `xvfb-run -a` when no display is available, as the builder's `docs/TESTING.md` explains (in a generated Electron app: `docs/electron/07-testing.md`).

After these steps a Linux machine has everything the chosen base needs.

## Mobile tooling (Tauri only)

This section lists the extra steps for Tauri apps that target phones. They follow the Tauri prerequisites page.

### Android, all operating systems

1. Install Android Studio (Windows and macOS commands above; Linux in step 7).
2. Open Android Studio, open the **SDK Manager**, and install **Android SDK Platform**, **Android SDK Platform-Tools**, **NDK (Side by side)**, **Android SDK Build-Tools** and **Android SDK Command-line Tools**.
3. Set `JAVA_HOME`, `ANDROID_HOME` and `NDK_HOME` as shown in the next section.
4. Add the Android targets to Rust:

   ```sh
   # Windows, macOS and Linux
   rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
   ```

### iOS, macOS only

The Tauri docs require the full Xcode (not only the Command Line Tools), then these commands:

```sh
# macOS
rustup target add aarch64-apple-ios x86_64-apple-ios aarch64-apple-ios-sim
brew install cocoapods
```

The CocoaPods site itself shows `sudo gem install cocoapods` as its install command; the Tauri docs use Homebrew, which this page follows.

## Environment variables

Android builds read three environment variables. `JAVA_HOME` points at a JDK, `ANDROID_HOME` at the Android SDK folder, and `NDK_HOME` at one installed NDK version inside it. The values below are those in the Tauri prerequisites page. One deliberate difference: the Tauri page uses `$(ls -1 $ANDROID_HOME/ndk)`, which produces an invalid path when more than one NDK version is installed, so this page adds `| tail -n 1` to pick the last (highest-sorted) version, matching the Windows command on the same Tauri page, which uses `Select-Object -Last 1`.

On **Linux**, add these lines to your shell profile (for example `~/.bashrc`):

```sh
export JAVA_HOME=/opt/android-studio/jbr
export ANDROID_HOME="$HOME/Android/Sdk"
export NDK_HOME="$ANDROID_HOME/ndk/$(ls -1 "$ANDROID_HOME/ndk" | tail -n 1)"
```

On **macOS**, add these lines to your shell profile (for example `~/.zshrc`):

```sh
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export NDK_HOME="$ANDROID_HOME/ndk/$(ls -1 "$ANDROID_HOME/ndk" | tail -n 1)"
```

On **Windows**, run these commands in PowerShell once; they store the variables for your user account. Run them after the NDK is installed, because the last command reads the NDK folder.

```powershell
# Windows (PowerShell)
[System.Environment]::SetEnvironmentVariable("JAVA_HOME", "C:\Program Files\Android\Android Studio\jbr", "User")
[System.Environment]::SetEnvironmentVariable("ANDROID_HOME", "$env:LocalAppData\Android\Sdk", "User")
$VERSION = Get-ChildItem -Name "$env:LocalAppData\Android\Sdk\ndk" | Select-Object -Last 1
[System.Environment]::SetEnvironmentVariable("NDK_HOME", "$env:LocalAppData\Android\Sdk\ndk\$VERSION", "User")
```

Programs only read environment variables when they start, so restart terminals and editors afterwards. The Tauri docs also give a command that refreshes the current PowerShell session:

```powershell
# Windows (PowerShell)
[System.Environment]::GetEnvironmentVariables("User").GetEnumerator() | % { Set-Item -Path "Env:\$($_.key)" -Value $_.value }
```

## Verify your machine

The `doctor` check looks at the machine without changing anything. It reports each tool it found with its version, flags tools that are older than the minimums on this page (`too old`), prints a fix for each missing one, and exits with an error when a tool required by the chosen base is missing. In the builder repository, run it from the repository root:

```sh
# macOS, Linux, or Git Bash on Windows
bash start.sh doctor --base electron
bash start.sh doctor --base tauri
bash start.sh doctor --base extension
```

```powershell
# Windows (PowerShell)
.\start.ps1 doctor --base electron
.\start.ps1 doctor --base tauri
.\start.ps1 doctor --base extension
```

Inside a generated app, the same check is the app's own `scripts/doctor.mjs`, which reads the base, package manager and targets from `project-plan.json`:

```sh
# any operating system, in the app folder
bun run doctor     # apps generated for npm: npm run doctor
```

Add `--mobile` to also check the Android and iOS tooling (`JAVA_HOME`, `ANDROID_HOME`, `NDK_HOME`, the Rust mobile targets, Xcode and CocoaPods on macOS), and `--e2e` to check the end-to-end test drivers (`tauri-driver`, `msedgedriver` against the installed Edge version on Windows, WebKitWebDriver and Xvfb on Linux). In a generated app with Android or iOS targets the mobile checks run automatically. The check covers Bun (or Node.js for npm apps), Node.js for Electron and browser extensions, Git, `rustc` and `cargo` with their minimum versions, WebKitGTK 4.1 and the `.deb` tools on Linux, the Xcode Command Line Tools on macOS, and WebView2 and the C++ Build Tools on Windows.

## Automating the steps: the bootstrap scripts

Two scripts perform the steps on this page automatically. `scripts/bootstrap.sh` detects the machine it runs on and covers Windows (run in Git Bash, the Bash shell installed with Git for Windows; it installs with winget), macOS and Linux; in the builder it is also run as `bash start.sh bootstrap`. `scripts/bootstrap.ps1` does the same for people who prefer Windows PowerShell 5.1 or PowerShell 7. Both accept the same options, which the list below explains.

- `--base electron|tauri|extension|all` chooses which base to prepare for (default `all`).
- `--mobile` adds Android tooling, and on macOS also iOS tooling (Tauri only).
- `--e2e` adds end-to-end test drivers (`tauri-driver`, and on Windows the `msedgedriver` that matches Edge).
- `--yes` answers every question with yes.
- `--dry-run` prints the plan and the commands without changing anything.

Each script first detects the operating system, distribution and processor architecture, then checks which tools are present at an acceptable version and prints a plan table (tool, version found, action). After you confirm, it installs only what is missing: with winget on Windows, with Homebrew and the official Bun and rustup scripts on macOS, and with apt, dnf or pacman plus the official scripts on Linux. On Linux it installs Node.js from the official nodejs.org binary into `~/.local/node`, verifying the SHA-256 checksum. It says beforehand which commands use `sudo`; it asks separately before installing Homebrew; it never edits a shell profile without printing the exact lines and asking first (it runs the Bun and rustup installers in modes that do not edit profiles); and on Windows it sets `JAVA_HOME`, `ANDROID_HOME` and `NDK_HOME` only after asking. Steps it cannot automate, such as installing SDK components in Android Studio or installing Xcode from the App Store, are printed as manual steps. It ends by running the doctor check: `bun cli/main.ts doctor` for the chosen base in the builder, or `scripts/doctor.mjs` (with Bun, or Node.js for npm apps) inside a generated app, where the scripts also read the base, targets and package manager from `project-plan.json`.

```sh
# Windows (Git Bash), macOS or Linux, from the repository root
bash start.sh bootstrap --base tauri --dry-run
bash start.sh bootstrap --base tauri
# inside a generated app: bash scripts/bootstrap.sh --dry-run
```

```powershell
# Alternative for Windows PowerShell, from the repository root
powershell -ExecutionPolicy Bypass -File scripts\bootstrap.ps1 --base tauri --dry-run
powershell -ExecutionPolicy Bypass -File scripts\bootstrap.ps1 --base tauri
```

Running a script a second time is safe, because tools that are already present are skipped and profile lines already present are not added again.

## Items marked UNVERIFIED

The following statements on this page could not be checked against a source in this session, and are listed together so they can be confirmed later.

1. That winget is obtained by installing "App Installer" from the Microsoft Store.
2. That the Build Tools component IDs listed for Visual Studio 2022 (17.x) are unchanged in Build Tools 2026 (18.x).
3. The version of the JDK bundled with Android Studio.
4. Which Fedora package provides the plain `node` command on each Fedora release.
5. That Android Studio on Linux is started with `bin/studio.sh` inside the unpacked folder.
6. The Fedora and Arch package names for the D-Bus headers, `WebKitWebDriver` and Xvfb.

In summary, this page gives a verified tool list and per-system commands for all three bases, and the bootstrap scripts apply the same commands automatically while asking before every change outside the package managers.
