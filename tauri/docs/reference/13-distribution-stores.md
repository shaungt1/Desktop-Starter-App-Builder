# Distribution Targets and Stores

Source pages:
- tauri-apps/tauri-docs @ `11934e365dfea50ef116f51cb7e26742554a34c6` (committed 2026-10-22), files in `src/content/docs/distribute/`:
  - `index.mdx` (https://v2.tauri.app/distribute/)
  - `windows-installer.mdx` (https://v2.tauri.app/distribute/windows-installer/)
  - `macos-application-bundle.mdx` (https://v2.tauri.app/distribute/macos-application-bundle/)
  - `dmg.mdx` (https://v2.tauri.app/distribute/dmg/)
  - `debian.mdx` (https://v2.tauri.app/distribute/debian/)
  - `rpm.mdx` (https://v2.tauri.app/distribute/rpm/)
  - `appimage.mdx` (https://v2.tauri.app/distribute/appimage/)
  - `flatpak.mdx` (https://v2.tauri.app/distribute/flatpak/)
  - `snapcraft.mdx` (https://v2.tauri.app/distribute/snapcraft/)
  - `aur.mdx` (https://v2.tauri.app/distribute/aur/)
  - `microsoft-store.mdx` (https://v2.tauri.app/distribute/microsoft-store/)
  - `app-store.mdx` (https://v2.tauri.app/distribute/app-store/)
  - `google-play.mdx` (https://v2.tauri.app/distribute/google-play/)
  - `crabnebula-cloud.mdx` (https://v2.tauri.app/distribute/crabnebula-cloud/)
- `@tauri-apps/cli` 2.12.4 `config.schema.json` (local Bun package cache), for bundle target names, `webviewInstallMode` types and defaults
- https://docs.crabnebula.dev/cloud/ (fetched), https://docs.crabnebula.dev/cloud/cli/install (fetched), https://docs.crabnebula.dev/cloud/auto-updates/tauri/ (fetched)

Verified on 2026-10-22

## What this page covers

A **distribution target** is a file format or channel through which people install the app: an installer they download, a Linux package, or an app store. This page describes every target in the Tauri 2 distribution docs: what it is, who it is for, what you need first, the exact configuration and commands, and the pitfalls the docs mention. Signing, which most targets require, is in `11-signing.md`; building the files in GitHub Actions is in `12-pipelines-ci.md`; the shorter overview in `07-distribute.md` remains valid and is not repeated in full.

All build commands are run from the app folder. The Tauri CLI command `tauri build` compiles the app and bundles it into every format in `bundle.targets` (default `"all"`); the 2.12.4 schema lists the desktop target names `deb`, `rpm`, `appimage`, `nsis`, `msi`, `app` and `dmg`. `--bundles` (short `-b`) selects formats for one build, and the build and bundle steps can be split:

```sh
# any OS; Bun first, then npm
bun run tauri build --no-bundle
bun run tauri bundle --bundles app,dmg
npm run tauri build -- --no-bundle
npm run tauri bundle -- --bundles app,dmg
```

The app version comes from `version` in `tauri.conf.json` and falls back to `package > version` in `src-tauri/Cargo.toml`. Several targets below derive their own version numbers from it.

## Decision table

The table below maps where you want users to install the app from to the target to produce and the section of this page that explains it. "Build host" is the operating system the build must run on according to the docs.

| I want users to install from... | Target / channel | Build host | Section |
| --- | --- | --- | --- |
| A download on my website or GitHub release, Windows | NSIS `-setup.exe` or MSI `.msi` | Windows (NSIS can be cross-compiled from Linux/macOS as a last resort) | Windows installer |
| The Microsoft Store | NSIS or MSI installer linked from a Store listing | Windows | Microsoft Store |
| A download on my website or GitHub release, macOS | DMG containing the `.app` | macOS | macOS app bundle; DMG |
| The Mac App Store | Signed `.pkg` built from the `.app` | macOS | Apple App Store: macOS |
| The iOS App Store | `.ipa` | macOS | Apple App Store: iOS |
| Google Play | Android App Bundle `.aab` | Any OS with the Android toolchain | Google Play |
| A direct Android download | `.apk` | Any OS with the Android toolchain | Google Play (Build APKs) |
| Debian, Ubuntu and derivatives | `.deb` | Linux (oldest distribution you support) | Debian |
| Fedora, RHEL, openSUSE | `.rpm` | Linux (oldest distribution you support) | RPM |
| Any Linux distribution, no install | `.AppImage` | Linux; ARM AppImages only on ARM or emulation | AppImage |
| Flathub (Flatpak) | Flatpak manifest submitted to Flathub | Linux | Flatpak / Flathub |
| Snap Store | Snap built from `snapcraft.yaml` | Linux | Snapcraft |
| Arch Linux users via the AUR | `PKGBUILD` in an AUR git repository | Arch Linux (for testing) | AUR |
| A hosted CDN with built-in update feed, metrics and channels | Upload bundles to CrabNebula Cloud | Any (CI) | CrabNebula Cloud |

As the table shows, every desktop target must be built on its own operating system except NSIS, and all Apple targets require a Mac. The Linux store channels (Flathub, Snap, AUR) are built from the `.deb` or from source rather than from a separate Tauri bundle type.

## Windows installer (NSIS and MSI)

**What it is.** Tauri produces two Windows installer formats. **MSI** (`.msi`, Microsoft Installer) is built with the WiX Toolset v3, a tool that compiles an XML description into an installer database; it can **only be built on Windows**. **NSIS** (`-setup.exe`, Nullsoft Scriptable Install System) is a scripted installer that can also be cross-compiled.

**Who it is for.** Anyone distributing outside the Microsoft Store, and also the Store itself (see the Microsoft Store section).

**Prerequisites.** A Windows machine or runner. Building MSI requires the Windows optional feature **VBSCRIPT**; if the build fails with `failed to run light.exe`, enable it in Settings, Apps, Optional features, More Windows features. Signing is covered in `11-signing.md`.

**Build.**

```sh
# Windows
bun run tauri build
npm run tauri build
```

For 32-bit Windows, first run `rustup target add i686-pc-windows-msvc`, then build with `--target i686-pc-windows-msvc`. For ARM64, install "MSVC v143 - VS 2022 C++ ARM64 build tools (Latest)" in Visual Studio Installer, run `rustup target add aarch64-pc-windows-msvc`, and build with `--target aarch64-pc-windows-msvc`; the NSIS installer itself remains x86 under emulation while the app is native ARM64.

**Cross-compiling NSIS from Linux or macOS** is described as a last resort. Install NSIS (`sudo apt install nsis` on Ubuntu; `brew install nsis` on macOS; Fedora needs `mingw64-nsis` plus the stubs and plugins copied from Tauri's `nsis-3.zip`), LLVM and LLD (`sudo apt install lld llvm`; `brew install llvm` and add `/opt/homebrew/opt/llvm/bin` to `PATH`), the target and `cargo-xwin`, then build:

```sh
# Linux or macOS
rustup target add x86_64-pc-windows-msvc
cargo install --locked cargo-xwin
bun run tauri build --runner cargo-xwin --target x86_64-pc-windows-msvc
npm run tauri build -- --runner cargo-xwin --target x86_64-pc-windows-msvc
```

Output goes to `target/x86_64-pc-windows-msvc/release/bundle/nsis/`. `XWIN_CACHE_DIR` shares the downloaded Windows SDK between projects. Signing a cross-compiled installer requires `bundle.windows.signCommand`.

**Key configuration.** The list below gives the `tauri.conf.json` keys the docs describe.

- `bundle.windows.webviewInstallMode.type`: how the installer provides WebView2 (the Microsoft Edge-based web view Tauri uses on Windows). The values are `downloadBootstrapper` (default, needs internet, adds 0 MB), `embedBootstrapper` (about 1.8 MB, better for Windows 7 `.msi`), `offlineInstaller` (about 127 MB, no internet needed), `fixedRuntime` with a `path` (about 180 MB, ships a fixed WebView2 version you extract from Microsoft's `.cab` into `src-tauri`), and `skip` (not recommended; the app will not run without an installed runtime). The docs' comparison table labels the fixed option "fixedVersion", but its JSON example and the 2.12.4 schema use `fixedRuntime`, which is the value to write. WebView2 ships with Windows 10 (April 2018 or later) and Windows 11.
- `bundle.windows.minimumWebview2Version`: for example `"110.0.1531.0"`; the installer triggers a WebView2 update if the installed one is older.
- `bundle.windows.wix`: `template` (a custom `.wxs` file), `fragmentPaths` with `componentGroupRefs`, `componentRefs`, `featureGroupRefs`, `featureRefs`, `mergeRefs` (to include WiX fragments, for example registry entries in `src-tauri/windows/fragments/registry.wxs`), and `language` (a string such as `"fr-FR"`, an array that produces one installer per language, or an object mapping languages to `{ "localePath": "./wix/locales/pt-BR.wxl" }`). Tauri references the locale strings `LaunchApp`, `DowngradeErrorMessage`, `PathEnvVarFeature` and `InstallAppFeature`.
- `bundle.windows.nsis`: `template` (a custom `.nsi`), `installerHooks` (for example `"./windows/hooks.nsh"`, defining the macros `NSIS_HOOK_PREINSTALL`, `NSIS_HOOK_POSTINSTALL`, `NSIS_HOOK_PREUNINSTALL`, `NSIS_HOOK_POSTUNINSTALL`), `installMode` (default per-user into `%LOCALAPPDATA%` without administrator rights; `perMachine` installs into Program Files and needs administrator rights; `both` lets the user choose and also needs administrator rights), `languages`, `customLanguageFiles` and `displayLanguageSelector`.
- `bundle.resources`: files such as a bundled `vc_redist.x64.msi` that hooks can install from `$INSTDIR\resources\`.

**Gotchas.** The list below collects the warnings on the page.

- Windows 7: the default `.msi` downloads the WebView2 bootstrapper, which can fail without TLS 1.2; use `embedBootstrapper`. Notifications on Windows 7 need the `windows7-compat` feature of `tauri-plugin-notification`.
- FIPS-compliant MSI: set `TAURI_BUNDLER_WIX_FIPS_COMPLIANT` to `true` before building (`$env:TAURI_BUNDLER_WIX_FIPS_COMPLIANT="true"` in PowerShell).
- Inside an NSIS hook macro, `${__FILEDIR__}` refers to the generated script's folder, not the hook file's; capture the hook folder in a top-level `!define` first.

## macOS app bundle

**What it is.** An application bundle (`<productName>.app`) is the folder format macOS executes. It contains `Contents/Info.plist` (the key-value file macOS reads for identity and settings), `Contents/MacOS/<app-name>` (the executable), `Contents/Resources/icon.icns` and bundled resources, plus `_CodeSignature`, `Frameworks`, `PlugIns` and `SharedSupport`.

**Who it is for.** It is the inner format for every macOS channel: it is wrapped in a DMG for downloads and in a `.pkg` for the App Store.

**Prerequisites.** A Mac. Signing and notarization (see `11-signing.md`) are required for downloads to open without warnings.

**Build.**

```sh
# macOS
bun run tauri build --bundles app
npm run tauri build -- --bundles app
```

**Key configuration.** The list below gives the keys and files the page describes.

- `src-tauri/Info.plist`: merged with the values Tauri generates, for example to add `NSCameraUsageDescription` and `NSMicrophoneUsageDescription`. Avoid overriding generated values such as the version. Translations go in `<lang>.lproj/InfoPlist.strings` files bundled through `bundle.resources` (for example `"infoplist/**": "./"`).
- `bundle.macOS.entitlements`: path to an `Entitlements.plist` (entitlements are rights such as the App Sandbox, applied at signing time).
- `bundle.macOS.minimumSystemVersion`: default `10.13`; for example `"12.0"`.
- `bundle.macOS.frameworks`: system frameworks by name (for example `"CoreAudio"`) or paths, relative to `src-tauri`, to `.framework` folders and `.dylib` files.
- `bundle.macOS.files`: maps destination paths inside `Contents` to source files, for example `"embedded.provisionprofile": "./profile-name.provisionprofile"`.

**Gotcha.** GUI apps on macOS and Linux do not inherit `PATH` from shell startup files such as `.zshrc`; the docs point to Tauri's `fix-path-env-rs` crate.

## DMG

**What it is.** A DMG (Apple Disk Image) wraps the `.app` in a window showing the app icon and the Applications folder, which the user drags the app onto. It is the most common format for macOS apps distributed outside the App Store.

**Who it is for.** Direct downloads on macOS. Not used for the App Store.

**Prerequisites.** A Mac; Developer ID signing and notarization for a warning-free install.

**Build.**

```sh
# macOS
bun run tauri build --bundles dmg
npm run tauri build -- --bundles dmg
```

**Key configuration.** All keys are under `bundle.macOS.dmg`: `background` (an image path), `windowSize` (default 660×400), `windowPosition`, `appPosition` and `applicationFolderPosition` (each `{ "x": ..., "y": ... }`).

**Gotcha.** Because of a known issue (`tauri-apps/tauri#1731`), icon sizes and positions are not applied when the DMG is created on CI platforms. `tauri-action` sets `TAURI_BUNDLER_DMG_IGNORE_CI=true` on macOS runners by default (see `12-pipelines-ci.md`).

## Debian (`.deb`)

**What it is.** The Debian package format, installed with `apt` or `dpkg` on Debian, Ubuntu and derivatives. Tauri's package defines icons, a desktop file (the Linux launcher entry) and the dependencies `libwebkit2gtk-4.1-0` and `libgtk-3-0`, plus `libappindicator3-1` if the app uses the system tray.

**Who it is for.** Users of Debian-based distributions; it is also the input for the Flathub, Snap and AUR recipes below.

**Prerequisites.** A Linux build host. The docs require building on the **oldest base system you intend to support** that still provides WebKitGTK 4.1, because a newer system raises the minimum glibc (the core C library) version; otherwise users see errors such as `version 'GLIBC_2.33' not found`. Ubuntu 22.04 and Debian 12 are named as suitable baselines, and a Docker container or GitHub Actions is recommended.

**Build.** `bun run tauri build` (or `--bundles deb`); output in `src-tauri/target/release/bundle/deb/`.

**Key configuration.** Additional dependencies and files go under `bundle.linux.deb`; `files` maps package paths to source paths relative to `tauri.conf.json`, for example `"/usr/share/README.md": "../README.md"`.

**Gotchas.** Cross-compiling for ARMv7 or ARM64 needs the Rust target (`armv7-unknown-linux-gnueabihf` or `aarch64-unknown-linux-gnu`), the matching GCC linker set in `.cargo/config.toml`, `dpkg --add-architecture`, ARM package sources on Ubuntu, `libwebkit2gtk-4.1-dev:<arch>`, possibly `libssl-dev:<arch>` or a vendored `openssl-sys`, and `PKG_CONFIG_SYSROOT_DIR`; the page lists each command. Native Arm runners (`ubuntu-22.04-arm`, `ubuntu-24.04-arm`) are simpler where available.

## RPM (`.rpm`)

**What it is.** The package format used by Fedora, Red Hat Enterprise Linux and related distributions.

**Who it is for.** Users of RPM-based distributions.

**Prerequisites.** As for Debian: build on the oldest supported base system. A GPG key if you sign the package (see `11-signing.md`).

**Build.** `bun run tauri build`; output in `src-tauri/target/release/bundle/rpm/`.

**Key configuration.** Keys under `bundle.linux.rpm`, described in the list below.

- `preInstallScript`, `postInstallScript`, `preRemoveScript`, `postRemoveScript`: paths to shell scripts run around installation and removal.
- `conflicts`, `provides`, `depends`, `obsoletes`: package relationship lists (packages listed in `obsoletes` are removed automatically when this package is installed).
- `files`, `desktopTemplate`, `release` (for example `"1"`), `epoch` (the docs advise against `epoch` unless necessary because it changes version comparison).
- `bundle.license` and `bundle.licenseFile` (or `license` in `Cargo.toml`) set the package license.

**Debugging commands** from the page: `rpm -qip package_name.rpm` (information), `rpm -qlp` (file list), `rpm -qp --scripts` (scripts), `rpm -qp --requires` (dependencies), and `rpm -ivvh` for verbose installation.

## AppImage

**What it is.** A single executable file that bundles the app and all its dependencies, runs on many distributions without installation (`chmod a+x MyProject.AppImage` then `./MyProject.AppImage`), and is larger: the docs say file size grows from the 2-6 MB range to 70+ MB.

**Who it is for.** Users of any distribution when you cannot provide a native package. It is also the Linux format for which the Tauri updater produces signed update artifacts (`07-distribute.md`).

**Prerequisites.** Same glibc rule as Debian. ARM AppImages cannot be cross-compiled because `linuxdeploy`, the AppImage tooling Tauri uses, does not support it; build them on ARM hardware, GitHub's Arm runners, or emulation.

**Build.** `bun run tauri build` (or `--bundles appimage`); output in `src-tauri/target/release/bundle/appimage/`.

**Key configuration.** `bundle.linux.appimage.bundleMediaFramework` (include GStreamer for audio and video playback; fully supported only on Ubuntu build systems; the schema says it adds about 15-35 MB) and `bundle.linux.appimage.files` (destination paths must begin with `/usr/`).

**Gotcha.** GStreamer plugins in the "ugly" set may have licenses that make redistribution hard.

## Flatpak / Flathub

**What it is.** Flatpak is a Linux packaging system that runs apps in a sandbox on top of a shared **runtime** (a set of libraries; Tauri apps use the GNOME runtime). Flathub is the main public Flatpak repository. Note that the Flathub card is commented out on the Tauri distribution index page, although the page itself exists.

**Who it is for.** Users on any distribution who install from Flathub or GNOME Software.

**Prerequisites.** `flatpak` and `flatpak-builder` (`sudo apt install flatpak flatpak-builder` on Debian/Ubuntu; `sudo pacman -S --needed flatpak flatpak-builder` on Arch; `sudo dnf install flatpak flatpak-builder` on Fedora), the GNOME runtime and SDK, an AppStream MetaInfo file (XML that describes the app for software centers), and a GitHub account for the submission pull request.

**Closed-source route (from the `.deb`).** The steps are listed below.

1. Install the runtime: `flatpak install flathub org.gnome.Platform//46 org.gnome.Sdk//46`.
2. Build the `.deb` and create the MetaInfo file.
3. Write `flatpak-builder.yaml` with `id: <identifier>`, `runtime: org.gnome.Platform`, `runtime-version: '47'`, `sdk: org.gnome.Sdk`, `command: <main_binary_name>`, and `finish-args` (`--socket=wayland`, `--socket=fallback-x11`, `--device=dri`, `--share=ipc`, and for a tray icon `--talk-name=org.kde.StatusNotifierWatcher` and `--filesystem=xdg-run/tray-icon:create`). Its single `simple` module lists the MetaInfo file and the `.deb` (a remote release URL needs `sha256`), extracts the `.deb` with `ar` and `tar`, and installs the binary, resources, desktop file (with `Icon=` rewritten to the identifier), icons and MetaInfo into `/app`. The full manifest is on the Flatpak page.
4. Build, install and run locally:

   ```sh
   # Linux
   flatpak-builder --force-clean --user --disable-cache --repo flatpak-repo flatpak flatpak-builder.yaml
   flatpak run <your flatpak id>
   ```

**Open-source route (from source).** Use `flatpak-builder-tools` to generate offline sources: `flatpak-node-generator` for the JavaScript lockfile (Yarn and npm forms are shown) and `flatpak-cargo-generator.py` for `src-tauri/Cargo.lock`; the manifest then builds the app offline and extracts the resulting `.deb`. The docs recommend (but do not require) shipping the MetaInfo file in the `.deb` via `bundle.linux.deb.files` at `/usr/share/metainfo/<id>.metainfo.xml`.

**Submitting to Flathub.** Fork the Flathub repository, clone it with `git clone --branch=new-pr git@github.com:<your user>/flathub.git`, create a branch named after the app, add the manifest, push, and open a pull request against the `new-pr` branch. After review and approval you are invited to a repository for the app, through which you publish later updates.

**Gotchas.** The page installs runtime version 46 but its manifests use `runtime-version: '47'`; install the runtime version the manifest names. Libraries beyond those of a default Tauri app should be built from source inside the Flatpak rather than copied from the host. Instead of opening `$XDG_RUNTIME_DIR` for the tray icon, the page shows `TrayIconBuilder::temp_dir_path(app.path().app_cache_dir().unwrap())`. The `--env=WEBKIT_DISABLE_COMPOSITING_MODE=1` finish-arg is suggested for black web views on Wayland. The docs' examples use Yarn or npm; a Bun lockfile route for `flatpak-node-generator` is not documented (**UNVERIFIED**).

## Snapcraft (Snap Store)

**What it is.** Snap is Canonical's sandboxed package format; Snapcraft is the tool that builds snaps, and the Snap Store distributes them.

**Who it is for.** Ubuntu users and others with `snapd`.

**Prerequisites.** An Ubuntu One account; an app name registered on the Snapcraft website; `snapd` (`sudo apt install snapd` on Debian; an AUR build on Arch; `sudo dnf install snapd` plus `sudo ln -s /var/lib/snapd/snap /snap` and a reboot on Fedora); the base snap and Snapcraft:

```sh
# Linux
sudo snap install core22
sudo snap install snapcraft --classic
```

**Configuration.** Create `snapcraft.yaml` in the project root. The docs' file uses `base: core22`, `confinement: strict`, a `layout` binding `/usr/lib/$SNAPCRAFT_ARCH_TRIPLET/webkit2gtk-4.1`, an app with `command: usr/bin/appname`, `desktop: usr/share/applications/appname.desktop` and `extensions: [gnome]`, and one `dump` part whose `build-snaps` are `node/20/stable` and `rustup/latest/stable`, whose `build-packages` include `libwebkit2gtk-4.1-dev` and `libayatana-appindicator3-dev`, whose `stage-packages` are `libwebkit2gtk-4.1-0` and `libayatana-appindicator3-1`, and whose `override-build` runs `npm install`, `npm run tauri build -- --bundles deb`, extracts the `.deb` into `$SNAPCRAFT_PART_INSTALL` and fixes the `Icon=` path. Commented sections show the extra D-Bus `slots`/`plugs` needed by the single-instance plugin. The `name` must equal the registered name.

**Build and release.**

```sh
# Linux
sudo snapcraft
snapcraft login
snapcraft upload --release=stable mysnap_latest_amd64.snap
```

Automatic builds can be set up on the app's developer page (Builds tab, "login with github").

**Gotchas.** The docs mark the test command `snap run your-app` with a TODO noting it "seems to be wrong". The recipe builds with npm inside the snap; a Bun-based `override-build` is not documented (**UNVERIFIED**).

## AUR (Arch User Repository)

**What it is.** The AUR is a community repository of build recipes (`PKGBUILD` files) for Arch Linux; users build and install packages from them with `makepkg` or an AUR helper.

**Who it is for.** Arch Linux users.

**Prerequisites.** An AUR account with SSH keys added; an Arch system for testing.

**Steps.**

1. Clone the (empty) package repository: `git clone https://aur.archlinux.org/your-repo-name`.
2. Write `PKGBUILD`. Every Tauri package must declare `depends=('cairo' 'desktop-file-utils' 'gdk-pixbuf2' 'glib2' 'gtk3' 'hicolor-icon-theme' 'libsoup' 'pango' 'webkit2gtk-4.1')`. The page gives two variants: one that downloads the release `.deb` per architecture (`source_x86_64`, `source_aarch64` with `sha256sums_*`) and extracts `data.tar.gz` in `package()`, with an `.install` script that refreshes the icon cache and desktop database; and a `-git` variant that builds from source with `pnpm tauri build -b deb`.
3. Generate metadata: `makepkg --printsrcinfo > .SRCINFO`.
4. Test with `makepkg` in the same folder.
5. Publish with `git add .`, `git commit -m "Initial Commit"`, `git push`.

**Gotcha.** The from-source example uses pnpm in `makedepends`; an equivalent with Bun is not documented (**UNVERIFIED**).

## Microsoft Store

**What it is.** The Windows app store operated by Microsoft. Tauri produces only EXE and MSI installers, so the Store listing links to your installer rather than containing an MSIX package.

**Who it is for.** Windows users who install from the Store.

**Prerequisites.** A Microsoft account enrolled as a developer (individual or company), and the app registered in Partner Center's Apps and Games page (New Product, "EXE or MSI app", reserve a name). The linked installer must be offline, handle its own updates (the updater plugin), and be code signed (`11-signing.md`). The docs do not state fees.

**Configuration and build.** Create `src-tauri/tauri.microsoftstore.conf.json`:

```json
{
  "bundle": {
    "windows": {
      "webviewInstallMode": {
        "type": "offlineInstaller"
      }
    }
  }
}
```

Then bundle with it merged into the main config:

```sh
# Windows
bun run tauri build --no-bundle
bun run tauri bundle --config src-tauri/tauri.microsoftstore.conf.json
npm run tauri build -- --no-bundle
npm run tauri bundle -- --config src-tauri/tauri.microsoftstore.conf.json
```

Icons, including Store icons, are generated with `bun run tauri icon /path/to/app-icon.png` (`npm run tauri icon /path/to/app-icon.png`).

**Gotchas.** The list below collects the requirements the page states.

- **Silent install.** Win32 installers must install silently or the submission fails with `10.2.9.2 Security - Package Submissions | Win32 products must install silently.` Enter `/S` (uppercase) as the silent install parameter for the NSIS installer (`MyApp_x64-setup.exe /S`), or `/quiet` for the MSI.
- **Publisher name.** The publisher cannot equal the product name. Tauri derives the publisher from the second part of the identifier, so `"productName": "Example"` with `"identifier": "com.example.app"` is invalid; set `bundle.publisher`, for example `"Example Inc."`.
- **Upload.** Upload the installer to a host of your choice and link it on the Store product page.

## Apple App Store (macOS and iOS)

**What it is.** Apple's marketplace for macOS and iOS apps, managed through App Store Connect.

**Who it is for.** Users who install from the Mac App Store or the iOS App Store.

**Prerequisites.** Enrollment in the Apple Developer program (99 US dollars per year according to the signing pages), a Mac, code signing for macOS and iOS (`11-signing.md`), and the app registered in App Store Connect with a Bundle ID that **must** match `identifier` in `tauri.conf.json`. Icons are generated after `tauri ios init` with `bun run tauri icon /path/to/app-icon.png --ios-color '#fff'` (`npm run tauri icon /path/to/app-icon.png -- --ios-color '#fff'`), where `--ios-color` is the iOS icon background.

**Versions.** Tauri derives `CFBundleVersion` from `version`; set `bundle.iOS.bundleVersion` or `bundle.macOS.bundleVersion` (for example `"100"`) for a different scheme.

### macOS

The App Store requires the configuration below; the docs suggest putting the App Store-only parts in `src-tauri/tauri.appstore.conf.json` so normal DMG builds do not need the provisioning profile.

```json
{
  "bundle": {
    "macOS": {
      "entitlements": "./Entitlements.plist",
      "files": {
        "embedded.provisionprofile": "path/to/profile-name.provisionprofile"
      }
    }
  }
}
```

The list below gives each requirement.

1. **Category:** `bundle.category`, for example `"Utility"`.
2. **Provisioning profile:** create an App ID matching the identifier on the Identifiers page, then a "Mac App Store Connect" profile on the Profiles page linked to the signing certificate, and include it with `bundle.macOS.files` as above.
3. **Info.plist:** `src-tauri/Info.plist` with `ITSAppUsesNonExemptEncryption` set to `false` (or `true` if the app uses non-exempt encryption), for export compliance.
4. **Entitlements:** `src-tauri/Entitlements.plist` with `com.apple.security.app-sandbox` `true`, `com.apple.application-identifier` `$TEAM_ID.$IDENTIFIER`, and `com.apple.developer.team-identifier` `$TEAM_ID` (the team ID is the App ID Prefix on the Identifiers page). The app must work inside the App Sandbox, and must be built with signing enabled for the entitlements to apply.

Build a universal app (Apple Silicon and Intel), then wrap it in a signed `.pkg` and upload it:

```sh
# macOS
bun run tauri build --no-bundle
bun run tauri bundle --bundles app --target universal-apple-darwin --config src-tauri/tauri.appstore.conf.json
xcrun productbuild --sign "<certificate signing identity>" --component "target/universal-apple-darwin/release/bundle/macos/$APPNAME.app" /Applications "$APPNAME.pkg"
xcrun altool --upload-app --type macos --file "$APPNAME.pkg" --apiKey $APPLE_API_KEY_ID --apiIssuer $APPLE_API_ISSUER
```

The npm form of the first two lines is `npm run tauri build -- --no-bundle` and `npm run tauri bundle -- --bundles app --target universal-apple-darwin --config src-tauri/tauri.appstore.conf.json`. The `.pkg` must be signed with a **Mac Installer Distribution** certificate. To support only Apple Silicon, set `bundle.macOS.minimumSystemVersion` to `"12.0"` and build without the universal target (on an Intel Mac, add and use `aarch64-apple-darwin`), adjusting the output path. After validation the build appears in TestFlight (Apple's beta testing service).

### iOS

```sh
# macOS
bun run tauri ios build --export-method app-store-connect
npm run tauri ios build -- --export-method app-store-connect
xcrun altool --upload-app --type ios --file "src-tauri/gen/apple/build/arm64/$APPNAME.ipa" --apiKey $APPLE_API_KEY_ID --apiIssuer $APPLE_API_ISSUER
```

The IPA is written to `src-tauri/gen/apple/build/arm64/$APPNAME.ipa`. Alternatively, `bun run tauri ios build --open` opens the Xcode project so you can archive and distribute from Xcode.

### Authentication for `altool`

`altool` authenticates with an App Store Connect API key created under Users and Access, Integrations, Individual Keys, with Developer access. `APPLE_API_ISSUER` is the Issuer ID and `APPLE_API_KEY_ID` the Key ID (these are shell variables for the command above; the equivalent variable Tauri itself reads is `APPLE_API_KEY`). The `.p8` key must be saved as `AuthKey_<APPLE_API_KEY_ID>.p8` in `./private_keys`, `~/private_keys`, `~/.private_keys` or `~/.appstoreconnect/private_keys`.

## Google Play

**What it is.** Google's Android app store, managed through the Play Console. Tauri generates an Android Studio project, so Google's standard Android publishing practices apply.

**Who it is for.** Android users installing from Google Play; APKs serve testing and direct downloads.

**Prerequisites.** A Play Console developer account, the app registered in the Play Console, Android code signing (`11-signing.md`), and the Android project created with `tauri android init`. The docs do not state fees. Icons: `bun run tauri icon /path/to/app-icon.png` (`npm run tauri icon /path/to/app-icon.png`).

**Build.**

```sh
# any OS with the Android toolchain
bun run tauri android build --aab
npm run tauri android build -- --aab
```

The bundle is written to `gen/android/app/build/outputs/bundle/universalRelease/app-universal-release.aab` (under `src-tauri`). The list below gives the other build options and keys.

- `--apk` builds APKs; `--split-per-abi` produces one file per architecture (useful only outside Google Play).
- `--target aarch64 --target armv7` restricts the architectures (default: aarch64, armv7, i686 and x86_64).
- `bundle.android.versionCode` overrides the default version code `major*1000000 + minor*1000 + patch`; the schema caps it at 2,100,000,000 and also offers `bundle.android.autoIncrementVersionCode`.
- `bundle.android.minSdkVersion` raises the minimum Android version from the default 24 (Android 7.0).

**Gotchas.** The **first upload must be done manually** in the Play Console so Google can verify the signature and package identifier. Tauri does not yet automate Play releases (the docs say this needs the Google Play Developer API and is a work in progress), and `tauri-action` does not upload to stores.

## CrabNebula Cloud

**What it is.** CrabNebula is an official Tauri partner. CrabNebula Cloud is a distribution platform integrated with the Tauri updater: the Tauri docs describe a CDN that ships installers and updates globally, is cost effective, exposes download metrics, and supports multiple release channels and download buttons for your website. CrabNebula's own overview says it distributes apps for multiple platforms and architectures from one place, gives public apps a market page, and supports channels through a `--channel` argument when drafting a release or through separate applications per environment.

**Who it is for.** Teams that want hosting, an update feed and download statistics without running their own server or relying on GitHub Releases.

**Prerequisites and sign-up.** The Tauri docs say to sign in to the Cloud website with a GitHub account and create an organization and an application. CrabNebula's overview adds that GitLab sign-in is also possible, that an organization needs a public name and a unique slug (which cannot be changed later), and, as read on 2026-10-22, that no trial, subscription or payment details are required to start; confirm current pricing with CrabNebula before relying on this. You also need an API key for the CLI.

**CLI.** The CLI binary is `cn` (`cn.exe` on Windows), downloaded from CrabNebula's CDN as described on its CLI install page. Authenticate with the `CN_API_KEY` environment variable or `--api-key`, and check the setup:

```sh
# Linux / macOS
export CN_API_KEY=<api-key>
chmod +x cn
./cn whoami
```

```bat
:: Windows Command Prompt
set CN_API_KEY=<api-key>
.\cn.exe whoami
```

A release is created with `release draft <org>/<app> --framework tauri`, assets are added with `release upload <org>/<app> --framework tauri` after each build, and it goes live with `release publish <org>/<app> --framework tauri` (or from the dashboard). CrabNebula also documents a `bootstrap` command that sets up an organization and a Tauri app with auto-update support. In GitHub Actions the same commands run through `crabnebula-dev/cloud-release@v0`; the workflow is in `12-pipelines-ci.md`.

**Updater integration.** CrabNebula's Tauri page gives this configuration, where `ORG_NAME` and `APP_NAME` are your Cloud slugs and `PUBKEY` the content of the updater public key; `{{target}}`, `{{arch}}` and `{{current_version}}` are filled in by Tauri at runtime:

```json
{
  "bundle": {
    "createUpdaterArtifacts": true
  },
  "plugins": {
    "updater": {
      "endpoints": [
        "https://cdn.crabnebula.app/update/ORG_NAME/APP_NAME/{{target}}-{{arch}}/{{current_version}}"
      ],
      "pubkey": "PUBKEY"
    }
  }
}
```

Builds must still be signed with the updater private key (`TAURI_SIGNING_PRIVATE_KEY`), exactly as for GitHub Releases. Apps migrating from Tauri v1 use `"createUpdaterArtifacts": "v1Compatible"`.

**Gotcha.** CrabNebula takes the release version from `tauri.conf.json` and ignores `Cargo.toml` and `package.json`, so keep `version` in `tauri.conf.json` authoritative.

## UNVERIFIED items on this page

The list below repeats every item on this page that could not be checked.

- Bun-based variants of the Flatpak (`flatpak-node-generator`), Snapcraft (`override-build`) and AUR (`makedepends`, `build()`) recipes; the docs show only Yarn, npm or pnpm.
- CrabNebula Cloud pricing beyond the statement read on its overview page on 2026-10-22.
- Fees for the Microsoft Store and Google Play developer accounts are not stated in the Tauri docs and are deliberately omitted.
