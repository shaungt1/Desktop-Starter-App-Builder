# Prerequisites

Source pages:
- https://v2.tauri.app/start/prerequisites/ (fetched live; matches the git source)
- https://github.com/tauri-apps/tauri-docs/blob/b62e441c3522fb9ffb01a92898071bac9463d6f7/src/content/docs/start/prerequisites.mdx
- https://github.com/tauri-apps/tauri-docs/blob/b62e441c3522fb9ffb01a92898071bac9463d6f7/src/content/docs/distribute/debian.mdx (Linux build baseline)
- https://github.com/tauri-apps/create-tauri-app/blob/379add21351259c03d3a61fa44aea62485b50cc9/src/deps.rs (Bun dependency check)

Verified on 2026-10-21

## Overview

Building a Tauri app needs three layers of tooling: the operating system's native build dependencies (a C/C++ toolchain and the web view libraries), the Rust toolchain, and, if the frontend uses a JavaScript framework, a JavaScript runtime and package manager. Mobile targets need extra Android or iOS tooling, which is summarized at the end. The sections below go through each layer per operating system; follow the section for the host OS, then install Rust, then the JavaScript runtime.

The docs state the supported desktop host systems as Linux, macOS Catalina (10.15) and later, and Windows 7 and later.

## Linux

On Linux, Tauri renders the UI with WebKitGTK, so the WebKitGTK 4.1 development package is the key dependency. The Debian/Ubuntu command in the official docs is:

```sh
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libxdo-dev \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev
```

What each package is for (the docs list the packages but do not explain each one; these one-line roles are general knowledge and are **UNVERIFIED** against the Tauri docs): `libwebkit2gtk-4.1-dev` is the web view engine; `build-essential` is the C compiler and `make`; `libxdo-dev` is X11 input simulation used by some window features; `libssl-dev` is OpenSSL; `libayatana-appindicator3-dev` provides system tray icons; `librsvg2-dev` renders SVG icons.

The docs also give commands for other distributions. These are reproduced as lists so an agent can install the right names:

- **Arch**: `sudo pacman -Syu` then `sudo pacman -S --needed webkit2gtk-4.1 base-devel curl wget file openssl appmenu-gtk-module libappindicator-gtk3 librsvg xdotool`
- **Fedora**: `sudo dnf check-update`, then `sudo dnf install webkit2gtk4.1-devel openssl-devel curl wget file libappindicator-gtk3-devel librsvg2-devel libxdo-devel`, then `sudo dnf group install "c-development"`
- **Gentoo**: `sudo emerge --ask net-libs/webkit-gtk:4.1 dev-libs/libayatana-appindicator net-misc/curl net-misc/wget sys-apps/file`
- **openSUSE**: `sudo zypper up`, then `sudo zypper in webkit2gtk3-devel libopenssl-devel curl wget file libappindicator3-1 librsvg-devel`, then `sudo zypper in -t pattern devel_basis`. (The docs list `webkit2gtk3-devel` here, not a 4.1 package; this is what the page says.)
- **Alpine**: `sudo apk add build-base webkit2gtk-4.1-dev curl wget file openssl libayatana-appindicator-dev librsvg`. The docs add that Alpine containers ship no fonts (install one such as `font-dejavu`), and that because Alpine uses musl, linker errors may require the `*-static` packages (`openssl-libs-static cairo-static harfbuzz-static glib-static wayland-static zlib-static`).
- **OSTree** (rpm-ostree): `sudo rpm-ostree install webkit2gtk4.1-devel openssl-devel curl wget file libappindicator-gtk3-devel librsvg2-devel libxdo-devel gcc gcc-c++ make`, then reboot.
- **NixOS**: the docs defer to the NixOS Wiki page for Tauri.

### Which Ubuntu/Debian release to build on

Tauri v2 requires WebKitGTK **4.1**. The Debian distribution guide names **Ubuntu 22.04** and **Debian 12** as suitable baselines because they ship `libwebkit2gtk-4.1-dev` in their standard repositories. It also warns that a binary built on a newer system may require a newer glibc than older target systems have (for example the runtime error `version 'GLIBC_2.33' not found`), so release builds should be made on the oldest system you intend to support, for example in Docker or CI. The package list above was confirmed to be present on Ubuntu 24.04 in this session, where `pkg-config --modversion webkit2gtk-4.1` reported 2.52.6 and a full `cargo check` of a generated app succeeded **(tested)**.

## macOS

Tauri on macOS uses Xcode's toolchain. The docs say to install Xcode from the Mac App Store or the Apple Developer site and to launch it once so it can finish setting up. If you only target desktop (not iOS), the Xcode Command Line Tools are enough:

```sh
xcode-select --install
```

## Windows

Windows needs two things: the Microsoft C++ Build Tools and the Microsoft Edge WebView2 runtime.

1. **Microsoft C++ Build Tools.** Download the "Microsoft C++ Build Tools" installer (https://visualstudio.microsoft.com/visual-cpp-build-tools/ as linked by the docs; not opened in this session) and select the **"Desktop development with C++"** workload during installation.
2. **WebView2.** The docs state that WebView2 is already present on Windows 10 version 1803 and later and on later Windows versions, so this step can usually be skipped. Otherwise install the "Evergreen Bootstrapper" from Microsoft's WebView2 download page.
3. **VBSCRIPT (only for `.msi` installers).** Building MSI packages (when `bundle.targets` is `"msi"` or `"all"`) needs the VBSCRIPT optional Windows feature. It is on by default on most systems. If a build fails with `failed to run light.exe`, enable it under Settings, Apps, Optional features, More Windows features, VBSCRIPT, then restart if asked. The docs note that Microsoft is deprecating VBSCRIPT.

## Rust (all platforms)

Tauri requires Rust, installed through `rustup` (the official Rust toolchain installer).

On Linux and macOS:

```sh
curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh
```

On Windows, use the installer from rust-lang.org, or in PowerShell:

```powershell
winget install --id Rustlang.Rustup
```

On Windows the **MSVC** toolchain must be the default host triple (`x86_64-pc-windows-msvc`, `i686-pc-windows-msvc` or `aarch64-pc-windows-msvc`). If Rust is already installed with a different default, switch with:

```powershell
rustup default stable-msvc
```

Restart the terminal (and sometimes the machine) after installing so the new `PATH` takes effect. The plugin workspace declares a minimum Rust version of 1.90 for the official plugins (from `plugins-workspace/Cargo.toml`), so an older toolchain should be updated with `rustup update`.

## JavaScript runtime (only for JavaScript frontends)

A JavaScript runtime is only needed when the frontend uses the JavaScript ecosystem. The docs recommend installing the Node.js LTS release and checking it with `node -v` and `npm -v`. Other package managers (pnpm, yarn) can be enabled with `corepack enable`.

The official docs do not have a separate Bun installation section. `create-tauri-app` supports Bun as a package manager, and when Bun is chosen it checks that a `bun` executable exists and, if not, tells the user to visit https://bun.sh/ (from `create-tauri-app/src/deps.rs`). The exact Bun install command is therefore not part of the Tauri docs and is **UNVERIFIED** here; follow Bun's own site. In this session Bun 1.4.3 was used successfully.

## Mobile targets (optional)

The docs give these extra steps only for apps that target Android or iOS.

- **Android**: install Android Studio; set `JAVA_HOME` to Android Studio's bundled JDK (for example `/opt/android-studio/jbr` on Linux); use the SDK Manager to install Android SDK Platform, Platform-Tools, NDK (Side by side), Build-Tools and Command-line Tools; set `ANDROID_HOME` and `NDK_HOME`; then run `rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android`.
- **iOS** (macOS only, full Xcode required): run `rustup target add aarch64-apple-ios x86_64-apple-ios aarch64-apple-ios-sim`, then install Homebrew and continue with the remaining iOS steps on the prerequisites page (those later steps were not summarized here).

## Quick checklist

The checklist below summarizes the minimum for a desktop build on each OS.

| Host OS | Must have |
| --- | --- |
| Ubuntu/Debian | the `apt` package list above, `rustup`, a JS runtime if using a JS frontend |
| macOS | Xcode or Xcode Command Line Tools, `rustup`, JS runtime |
| Windows | C++ Build Tools with "Desktop development with C++", WebView2 (preinstalled on Windows 10 1803+), `rustup` with the MSVC default, JS runtime; VBSCRIPT enabled if building `.msi` |

The Tauri CLI also has a `tauri info` command (see `02-create-project.md`). Its output was not examined in this session, so using it to confirm the setup is a reasonable check but **UNVERIFIED** against the docs.
