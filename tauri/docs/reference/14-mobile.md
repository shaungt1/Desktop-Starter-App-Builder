# Building for Android and iOS

Source pages:
- https://github.com/tauri-apps/tauri-docs (git clone, commit `11934e365dfea50ef116f51cb7e26742554a34c6`), files under `src/content/docs/`:
  - `start/prerequisites.mdx` (https://v2.tauri.app/start/prerequisites/)
  - `develop/index.mdx` (https://v2.tauri.app/develop/): mobile dev server, device selection, `--open`, `--host`, Web Inspector, troubleshooting
  - `start/project-structure.mdx` (https://v2.tauri.app/start/project-structure/)
  - `start/migrate/from-tauri-1.mdx` (https://v2.tauri.app/start/migrate/from-tauri-1/), section "Preparing for Mobile"
  - `develop/configuration-files.mdx` (https://v2.tauri.app/develop/configuration-files/)
  - `security/capabilities.mdx` (https://v2.tauri.app/security/capabilities/) and `learn/Security/capabilities-for-windows-and-platforms.mdx` (https://v2.tauri.app/learn/security/capabilities-for-windows-and-platforms/)
  - `plugin/autostart.mdx` and `plugin/updater.mdx` (desktop-only plugin registration pattern)
  - `develop/icons.mdx` (https://v2.tauri.app/develop/icons/)
  - `develop/Tests/index.mdx`, `develop/Tests/WebDriver/index.mdx`, `develop/Tests/WebDriver/manual-setup.mdx`
  - `distribute/google-play.mdx` (https://v2.tauri.app/distribute/google-play/)
  - `reference/_cli_ios.mdx` (the iOS command help text, a partial included in the CLI reference page)
  - `reference/environment-variables.mdx` (https://v2.tauri.app/reference/environment-variables/)
- https://github.com/tauri-apps/tauri (sparse clone, commit `8d3efdeea5b4221301a4fc5e2d4ab969abe8aa7f`): `crates/tauri-cli/config.schema.json` (the `bundle.android` and `bundle.iOS` keys), `crates/tauri-cli/CHANGELOG.md` (recent Android and iOS fixes), `crates/tauri-cli/src/add.rs` (what `tauri add` writes)
- `tauri-utils` 2.10.2 crate source, `src/platform.rs` (the exact spelling of capability platform names)
- `@tauri-apps/cli` 2.12.4 run locally: `tauri android --help`, `tauri android init --help`, `tauri android dev --help`, `tauri android build --help`, `tauri icon --help`, and a real `tauri icon` run **(tested)**
- https://developer.android.com/studio/run/managing-avds (fetched in this session): creating an Android Virtual Device in Android Studio

Verified on 2026-10-22

## What this page covers

Tauri 2 can build the same app for Android phones and tablets and for iPhone and iPad, in addition to desktop. This page explains everything that is different on mobile: the extra tools to install on each host operating system, the changes a project needs before it can compile for mobile, the commands that create, run and build the mobile projects, how to run the app in an emulator or simulator, how to debug and test it, and how app icons are produced. It assumes the desktop prerequisites in `01-prerequisites.md` are already installed, and it extends the short mobile summary at the end of that file.

The following terms are used throughout and are defined here once:

- **Host** means the computer you build on; **target** means the device the app runs on.
- **Android SDK** (Software Development Kit) is Google's collection of Android build tools and platform libraries. **Android Studio** is Google's Android development environment, which installs and manages the SDK.
- **NDK** (Native Development Kit) is the part of the Android tooling that compiles native (non-Java) code, which is how Tauri's Rust code is built for Android.
- **JDK** (Java Development Kit) is the Java compiler and runtime. Android Studio ships its own JDK, called the JetBrains Runtime, in a folder named `jbr`.
- **Gradle** is the build system that Android projects use.
- **adb** (Android Debug Bridge) is the command-line tool that talks to connected Android devices and emulators.
- **AVD** (Android Virtual Device) is a saved configuration for the Android **emulator**, a program that runs a virtual Android phone on the host.
- **Xcode** is Apple's development environment, required for any iOS build. The iOS **simulator**, part of Xcode, runs a virtual iPhone or iPad on a Mac.
- **Homebrew** is a package manager for macOS. **CocoaPods** is a dependency manager for Apple platform projects.
- **rustup target** is a Rust standard library for one target platform. Rust needs one per Android or iOS processor type before it can compile for it.
- **APK** (Android Package) is an installable Android app file; **AAB** (Android App Bundle) is the format uploaded to Google Play. **IPA** is the installable iOS app archive.

## 1. Which host can build which target

The table below shows which mobile platform can be built from which host, as stated in the prerequisites page and the iOS command reference.

| Host OS | Android | iOS |
| --- | --- | --- |
| Windows | Yes | No |
| macOS | Yes | Yes (requires full Xcode, not only the Command Line Tools) |
| Linux | Yes | No |

The iOS command reference states this directly: "All iOS commands are only available on macOS hosts." On Windows and Linux the `ios` subcommand does not exist at all; running `tauri ios --help` on Linux with CLI 2.12.4 printed `error: unrecognized subcommand 'ios'` **(tested)**.

## 2. Android prerequisites (Windows, macOS, Linux)

The prerequisites page gives five steps for Android. They are listed below with the exact commands the docs give for each host.

### Step 1: Install Android Studio

Download and install Android Studio from the "Android Studio" download page on the Android Developers website, which the prerequisites page links to (that page was not opened in this session, so no link is given here).

### Step 2: Set `JAVA_HOME`

`JAVA_HOME` tells build tools where the JDK is. The docs point it at the JDK bundled with Android Studio.

Linux (bash or zsh):

```sh
export JAVA_HOME=/opt/android-studio/jbr
```

macOS (bash or zsh):

```sh
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
```

Windows (PowerShell):

```powershell
[System.Environment]::SetEnvironmentVariable("JAVA_HOME", "C:\Program Files\Android\Android Studio\jbr", "User")
```

The Linux path assumes Android Studio was unpacked to `/opt/android-studio`; adjust it if it was installed elsewhere.

### Step 3: Install SDK packages with the SDK Manager

In Android Studio, open the SDK Manager and install the following five packages, which the docs list by their names in the SDK Manager:

1. Android SDK Platform
2. Android SDK Platform-Tools
3. NDK (Side by side)
4. Android SDK Build-Tools
5. Android SDK Command-line Tools

The docs add that "Show Package Details" in the SDK Manager allows installing older package versions, and advise doing so only when necessary because older versions may bring compatibility or security problems.

### Step 4: Set `ANDROID_HOME` and `NDK_HOME`

`ANDROID_HOME` is the SDK folder; `NDK_HOME` is the installed NDK version folder inside it. The docs' commands pick the NDK folder automatically.

Linux (bash or zsh):

```sh
export ANDROID_HOME="$HOME/Android/Sdk"
export NDK_HOME="$ANDROID_HOME/ndk/$(ls -1 $ANDROID_HOME/ndk)"
```

macOS (bash or zsh):

```sh
export ANDROID_HOME="$HOME/Library/Android/sdk"
export NDK_HOME="$ANDROID_HOME/ndk/$(ls -1 $ANDROID_HOME/ndk)"
```

Windows (PowerShell):

```powershell
[System.Environment]::SetEnvironmentVariable("ANDROID_HOME", "$env:LocalAppData\Android\Sdk", "User")
$VERSION = Get-ChildItem -Name "$env:LocalAppData\Android\Sdk\ndk" | Select-Object -Last 1
[System.Environment]::SetEnvironmentVariable("NDK_HOME", "$env:LocalAppData\Android\Sdk\ndk\$VERSION", "User")
```

On Windows these commands store user-level variables that already-open programs do not see. The docs say to restart the terminal and editor, or to refresh the current PowerShell session with:

```powershell
[System.Environment]::GetEnvironmentVariables("User").GetEnumerator() | % { Set-Item -Path "Env:\$($_.key)" -Value $_.value }
```

On Linux and macOS, `export` only affects the current terminal. To keep the variables, add the same `export` lines to your shell's startup file (for example `~/.bashrc` or `~/.zshrc`). This persistence advice is ordinary shell practice and is not stated in the Tauri docs. Note also that the Linux/macOS `NDK_HOME` line assumes exactly one NDK version is installed; with several, `ls -1` returns several names and the path breaks, so set the folder name explicitly in that case.

The CLI changelog (entry for PR #14094) adds that the CLI now tries to detect `ANDROID_HOME` and `NDK_HOME` from default system locations and can install them with the Android command-line tools if needed. Setting the variables explicitly remains the documented method.

### Step 5: Add the Android Rust targets

All operating systems:

```sh
rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
```

These four targets correspond to 64-bit ARM phones, 32-bit ARM phones, 32-bit x86 emulators and 64-bit x86 emulators. `tauri android init` also installs the Rust targets unless `--skip-targets-install` is passed (from `tauri android init --help`).

### Java and Gradle versions

The CLI changelog records that the Android template now uses Gradle 9.6.1 (Android Gradle plugin `com.android.tools.build:gradle` 9.3.1) and Kotlin 2.2, that the minimum supported Gradle is 8.13, and that Android commands now warn when the active Java version is too new for the project's Gradle version (the example given is Java 27 against Gradle 9.6.1). If you see that warning, point `JAVA_HOME` at a JDK the Gradle version supports, such as Android Studio's bundled `jbr`. A project generated before these changes can be updated by deleting `src-tauri/gen/android/gradle/wrapper/gradle-wrapper.properties` and re-running `tauri android init`, as that changelog entry says.

## 3. iOS prerequisites (macOS only)

The docs require full Xcode (installed from the Mac App Store or Apple's developer site and launched once), not only the Xcode Command Line Tools. Then run the three steps below in Terminal on the Mac.

1. Add the iOS Rust targets:

   ```sh
   rustup target add aarch64-apple-ios x86_64-apple-ios aarch64-apple-ios-sim
   ```

   `aarch64-apple-ios` is for real iPhones and iPads, `aarch64-apple-ios-sim` is the simulator on Apple Silicon Macs, and `x86_64-apple-ios` is the simulator on Intel Macs.

2. Install Homebrew:

   ```sh
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

3. Install CocoaPods with Homebrew:

   ```sh
   brew install cocoapods
   ```

The config schema states that `bundle.iOS.developmentTeam` "is required for iOS development because code signing is enforced", and that the `APPLE_DEVELOPMENT_TEAM` environment variable overrides it. The team ID is shown on the Apple Developer account's membership page. Whether the simulator alone can run without a team ID set is **UNVERIFIED** (no Mac was available in this session).

## 4. Project changes needed for mobile

A project created by `create-tauri-app` already has all of the following, so this section is mainly for checking an existing project or one produced by another generator. Each change is explained with what it does and why.

### 4.1 The Rust crate must also build as a library

On mobile, Tauri compiles the app as a library that the Android or iOS host app loads, rather than as an executable. The project structure page explains: "we compile your app to a library in mobile builds and load them through the platform frameworks". `src-tauri/Cargo.toml` therefore needs a `[lib]` section:

```toml
[lib]
# The `_lib` suffix avoids a name clash with the binary on Windows.
name = "my_app_lib"
crate-type = ["staticlib", "cdylib", "rlib"]
```

The migration guide uses `name = "app_lib"`; `create-tauri-app` uses the package name with `_lib` appended (for a package `my-app`, `my_app_lib`), with a comment explaining the suffix. Any valid name works as long as `main.rs` calls it.

### 4.2 One shared entry point in `lib.rs`

All app code lives in `src-tauri/src/lib.rs`, in a public function marked with the mobile entry-point attribute:

```rust
// src-tauri/src/lib.rs
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // plugins, state, commands ...
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

`#[cfg_attr(mobile, ...)]` applies the `tauri::mobile_entry_point` macro only when compiling for Android or iOS; the docs say this macro "prepares your function to be executed on mobile". The desktop executable keeps a tiny `main.rs` that calls the same function:

```rust
// src-tauri/src/main.rs
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    my_app_lib::run();
}
```

The docs advise leaving `main.rs` as it is and putting all changes in `lib.rs`.

### 4.3 Keep desktop-only plugins out of mobile builds

Some official plugins exist only on desktop. `06-plugins.md` lists them: `autostart`, `cli`, `global-shortcut`, `positioner`, `single-instance`, `updater` and `window-state`. Two things must both be true for a mobile build to compile:

1. The Cargo dependency is limited to desktop targets. `tauri add` does this automatically (its source in `add.rs` writes `[target.'cfg(not(any(target_os = "android", target_os = "ios")))'.dependencies]`), and the plugin pages show the manual equivalent:

   ```sh
   cargo add tauri-plugin-updater --target 'cfg(any(target_os = "macos", windows, target_os = "linux"))'
   ```

2. Every line of Rust that uses the plugin is behind `#[cfg(desktop)]`. The plugin pages register desktop-only plugins inside `setup`:

   ```rust
   #[cfg_attr(mobile, tauri::mobile_entry_point)]
   pub fn run() {
       tauri::Builder::default()
           .setup(|app| {
               #[cfg(desktop)]
               app.handle().plugin(tauri_plugin_updater::Builder::new().build())?;
               Ok(())
           })
           .run(tauri::generate_context!())
           .expect("error while running tauri application");
   }
   ```

   (The docs' example omits the trailing `?`; it is added here so a registration error is not silently ignored. `AppHandle::plugin` returns `tauri::Result<()>` in the `tauri` 2.12.5 source, and `setup` may return an error, so `?` compiles.)

**Important pitfall found in the CLI source.** `tauri add` limits the *dependency* to desktop, but it inserts the registration as a plain `.plugin(tauri_plugin_<name>::...)` call directly after `tauri::Builder::default()`, with no `#[cfg(desktop)]` guard (see `add.rs`, and a project generated in this session showed exactly that for `updater`). That code compiles on desktop but fails on Android and iOS, because the crate is not available there. After running `tauri add` for a desktop-only plugin in an app that targets mobile, move the call into `setup` under `#[cfg(desktop)]` as shown above.

`#[cfg(desktop)]` and `#[cfg(mobile)]` are configuration flags that Tauri's build script defines; the official plugins and docs use both.

### 4.4 Platform-specific capabilities

A capability file can be limited to certain platforms with a `platforms` array. Without the array, the capability applies everywhere. The security page shows one capability for desktop-only permissions and one for mobile-only permissions:

```json
// src-tauri/capabilities/desktop.json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "desktop-capability",
  "windows": ["main"],
  "platforms": ["linux", "macOS", "windows"],
  "permissions": ["updater:default"]
}
```

```json
// src-tauri/capabilities/mobile.json
{
  "$schema": "../gen/schemas/mobile-schema.json",
  "identifier": "mobile-capability",
  "windows": ["main"],
  "platforms": ["iOS", "android"],
  "permissions": ["barcode-scanner:allow-scan"]
}
```

The spelling of platform names matters. The `tauri-utils` source (`src/platform.rs`) and the generated capability schema accept exactly `"macOS"`, `"windows"`, `"linux"`, `"android"` and `"iOS"`. One tutorial page (`learn/Security/capabilities-for-windows-and-platforms.mdx`) writes `macos` and `ios` in lower case; the source has no alias for those spellings, so they would be rejected. Use the mixed-case forms. (This conclusion is from reading the deserializer, not from running a failing build.)

A capability that grants permissions of a desktop-only plugin must carry a desktop-only `platforms` list, otherwise the mobile build refers to a plugin it does not contain. `tauri add` for a desktop-only plugin created such a `desktop.json` file automatically in a project generated in this session.

### 4.5 Platform configuration files

Tauri reads optional per-platform configuration files next to `tauri.conf.json` and merges them onto it with JSON Merge Patch (RFC 7396). For mobile the files are `src-tauri/tauri.android.conf.json` and `src-tauri/tauri.ios.conf.json` (or `Tauri.android.toml` / `Tauri.ios.toml`). Objects merge key by key, but arrays replace the base array entirely, including `app.windows`; see `03-config.md` for the full rule.

The mobile settings live under `bundle.android` and `bundle.iOS`. The table below lists every key in the config schema at the commit read, with its default and meaning.

| Key | Default | Meaning |
| --- | --- | --- |
| `bundle.android.minSdkVersion` | `24` | Lowest Android API level that can install the app. The Google Play page says the minimum supported Android version for Tauri apps is Android 7.0 (API 24). |
| `bundle.android.versionCode` | derived | Integer version for Google Play, at most 2,100,000,000. If unset, Tauri computes `major*1000000 + minor*1000 + patch` from `version`. |
| `bundle.android.autoIncrementVersionCode` | `false` | When `true`, reads the last code from `tauri.properties` and adds one per build; the schema says to remove `/tauri.properties` from `src-tauri/gen/android/app/.gitignore` to use it. |
| `bundle.android.debugApplicationIdSuffix` | none | Suffix added to the application ID of debug builds (for example `".debug"`), so debug and release builds can be installed side by side. |
| `bundle.iOS.developmentTeam` | none | Apple team ID used for code signing; required for iOS development. Overridden by `APPLE_DEVELOPMENT_TEAM`. |
| `bundle.iOS.minimumSystemVersion` | `"15.0"` | Lowest iOS version supported (maps to `IPHONEOS_DEPLOYMENT_TARGET`). |
| `bundle.iOS.bundleVersion` | none | Build iteration number (`CFBundleVersion`). |
| `bundle.iOS.frameworks` | none | Extra iOS frameworks to bundle; the iOS project must be recreated for changes to apply. |
| `bundle.iOS.infoPlist` | none | Path to an `Info.plist` to merge with the default. Tauri also looks for `Info.plist` and `Info.ios.plist` next to the config file. |
| `bundle.iOS.template` | none | A custom XcodeGen `project.yml` template. |

For example, a `tauri.android.conf.json` that raises the minimum Android version and lets debug and release builds coexist would contain:

```json
{
  "bundle": {
    "android": { "minSdkVersion": 28, "debugApplicationIdSuffix": ".debug" }
  }
}
```

### 4.6 The identifier

The top-level `identifier` (reverse domain form, such as `com.example.myapp`) becomes the app's package identity on mobile; the schema describes it as being used for "the bundle ID", and the `debugApplicationIdSuffix` description shows it as the Android application ID. The schema rule is: only ASCII letters, digits, hyphens and periods; and the placeholder `com.tauri.dev` is rejected by `tauri build`.

The CLI changelog notes that the iOS Xcode project uses a "sanitized iOS bundle identifier" derived from `identifier`, which means characters iOS does not allow are rewritten. Android package names also have their own rules (for example, segments starting with a digit or using Java keywords are not valid in Java package names), but the Tauri docs do not state them; staying with lower-case letters, digits and periods, with each segment starting with a letter, is a safe choice that satisfies both platforms. That last recommendation is **UNVERIFIED** against Tauri sources. Changing the identifier after `tauri android init` / `tauri ios init` likely requires re-running init so the generated projects pick it up (**UNVERIFIED**).

## 5. The frontend dev server on mobile

During `tauri android dev` or `tauri ios dev`, the app on the device loads the frontend from the dev server on the host, just as on desktop. A device is a different machine (or a virtual one), so `localhost` on the device is not the host. The docs and CLI help describe how this is handled:

- **Android.** The CLI forwards the dev server port from the device back to the host with `adb reverse` (the CLI changelog entry for PR #16105 describes fixes to this forwarding). An emulator or a USB-connected phone can therefore reach `localhost`.
- **Physical iOS devices.** The develop page says the dev server "must" listen on the address the CLI provides in the `TAURI_DEV_HOST` environment variable. That address is either the host's public network address (the default) or the iOS device's TUN address, which is more secure but needs Xcode to connect to the device; to use it, open Xcode, ensure the device is connected via network in Window > Devices and Simulators, then run `tauri ios dev --force-ip-prompt` and pick the IPv6 address ending in `::2`.
- **`--host`.** The `--host` flag makes the CLI use the public network address on any platform and replaces `build.devUrl`'s host with it. The help text says "it is your responsibility to set up your development server to listen on this address by using 0.0.0.0 as host for instance", that the CLI sets `TAURI_DEV_HOST` when this flag is set or when running on an iOS device, and that "On Windows we use the public network address by default."

The dev server must therefore read `TAURI_DEV_HOST` and listen on it when it is set. For Vite, which the builder's React template uses, the config generated by `create-tauri-app` (and shown in the docs) is:

```ts
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// create-tauri-app adds `// @ts-expect-error` here when @types/node is not installed
import process from "node:process";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig(() => ({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: "ws", host, port: 1421 } : undefined,
    watch: { ignored: ["**/src-tauri/**"] },
  },
}));
```

`host: host || false` keeps Vite on `localhost` normally and binds it to the network address when `TAURI_DEV_HOST` is set. `hmr` (hot module replacement, the live-reload channel) is moved to port 1421 on the same address so the device can reach it. For Next.js, see `17-nextjs-frontend.md`.

Two cautions from the docs apply. On first `tauri ios dev`, iOS asks permission to find and connect to devices on the local network; tap Allow and restart the app. The built-in Tauri static dev server (used when there is no `devUrl`) has no encryption or authentication, so the develop page warns never to use it on untrusted networks; the same caution applies to any dev server exposed on the network.

## 6. Mobile commands

All mobile work goes through four subcommands under `tauri android` and `tauri ios`. The table below summarizes them from the CLI help.

| Command | What it does |
| --- | --- |
| `android init` / `ios init` | Creates the native project under `src-tauri/gen/android` or `src-tauri/gen/apple` and installs Rust targets. Run once per project, and again after template changes. Options: `--ci` (no prompts), `--skip-targets-install`, `-c/--config`; iOS also `-r/--reinstall-deps`. |
| `android dev` / `ios dev` | Runs `beforeDevCommand`, builds, installs and launches on a device, emulator or simulator, and rebuilds when Rust code changes. Takes an optional device name. |
| `android build` / `ios build` | Runs `beforeBuildCommand` and builds release packages: APK and AAB on Android, IPA on iOS. |
| `android run` / `ios run` | Runs the app in production (release-style) mode on a device, using `frontendDist`. |

The `[DEVICE]` argument and the most useful flags of `dev` are listed below.

- `[DEVICE]`: run on the named device, emulator or simulator, for example `"iPhone 15"`.
- `-o, --open`: open Android Studio or Xcode instead of running directly.
- `--host [<HOST>]`: use the public network address for the dev server (see section 5).
- `--force-ip-prompt`: always ask which IP address the device should use.
- `--release`: run release-mode code.
- `--no-watch`: do not rebuild on file changes.
- `--root-certificate-path <PATH>`: certificate of an HTTPS dev server, required for mobile dev over HTTPS (env `TAURI_DEV_ROOT_CERTIFICATE_PATH`).

The build flags are listed below.

- Android: `--apk`, `--aab`, `-t/--target` with `aarch64`, `armv7`, `i686`, `x86_64` (all by default), `--split-per-abi`, `-d/--debug`, `--ci`.
- iOS: `-t/--target` with `aarch64` (default), `aarch64-sim`, `x86_64`; `--export-method` with `app-store-connect`, `release-testing` or `debugging`; `--build-number`; `-d/--debug`; `--ci`. The changelog also lists `--no-sign` and `--archive-only` (not shown in the help text at this docs commit, so **UNVERIFIED** for the current CLI).

### Command forms with Bun and npm

The commands below are shown in Bun form first and npm form second. With npm, any flag meant for Tauri must come after `--`, otherwise npm consumes it; the Google Play page uses this form (`npm run tauri android build -- --aab`). The develop page omits the `--` in its npm examples; the form with `--` is the safe one.

Create the native projects (any host for Android; macOS for iOS):

```sh
bun run tauri android init
bun run tauri ios init
```

```sh
npm run tauri android init
npm run tauri ios init
```

Run in development:

```sh
bun run tauri android dev
bun run tauri ios dev
```

```sh
npm run tauri android dev
npm run tauri ios dev
```

Run on a named simulator, open the IDE, or use the network address for a physical device:

```sh
bun run tauri ios dev "iPhone 15"
bun run tauri android dev --open
bun run tauri ios dev --open --host
```

```sh
npm run tauri ios dev "iPhone 15"
npm run tauri android dev -- --open
npm run tauri ios dev -- --open --host
```

Build release packages:

```sh
bun run tauri android build --aab
bun run tauri android build --apk
bun run tauri ios build --export-method app-store-connect
```

```sh
npm run tauri android build -- --aab
npm run tauri android build -- --apk
npm run tauri ios build -- --export-method app-store-connect
```

The Google Play page gives the AAB output path as `gen/android/app/build/outputs/bundle/universalRelease/app-universal-release.aab` (relative to `src-tauri`). Store signing is covered in the docs pages https://v2.tauri.app/distribute/sign/android/ and https://v2.tauri.app/distribute/app-store/ and is outside this page.

When `--open` is used, the docs warn that the Tauri CLI process "must be running and cannot be killed" while you work in Xcode or Android Studio, because the IDE's build step calls back into it. Keep `tauri android dev --open` or `tauri ios dev --open` running until the IDE is closed.

## 7. Running on an Android emulator, step by step

The Tauri docs say only that the dev command runs on a connected device and otherwise prompts for an emulator or simulator. Creating the emulator itself is done in Android Studio; steps 1 to 4 below come from the Android Studio page "Create and manage virtual devices" (https://developer.android.com/studio/run/managing-avds), and steps 5 to 7 from the Tauri docs.

1. **Open the Device Manager.** From the Android Studio welcome screen choose **More Actions > Virtual Device Manager**; from an open project choose **View > Tool Windows > Device Manager**.
2. **Start creating a device.** Click **Create Device** (the page also describes clicking **+** then **Create Virtual Device** from an open project). The **Select Hardware** window opens. Choose a phone profile and click **Next**.
3. **Choose a system image.** In the **System Image** window, select an Android version. If a download icon is shown next to it, click the icon to download it (this needs an internet connection), then click **Next**. Pick an image whose API level is at least the app's `minSdkVersion` (24 by default).
4. **Name and finish.** In **Verify Configuration**, adjust the name or settings if needed and click **Finish**. The device appears in the **Virtual** tab. Start it with the **Launch** (play) button.
5. **Initialize the Android project once**, from the project root on any host:

   ```sh
   bun run tauri android init
   ```

   ```sh
   npm run tauri android init
   ```

6. **Run the app.** With the emulator running, start the dev command. It builds the Rust library for the emulator's architecture, installs the APK and opens the app.

   ```sh
   bun run tauri android dev
   ```

   ```sh
   npm run tauri android dev
   ```

   If no device or running emulator is found, the CLI prompts you to pick one. You can also pass the device name as the argument (`bun run tauri android dev "<name>"`). The CLI changelog notes that the CLI prompts to restart the emulator if it is running but not connected to adb.

7. **Edit and reload.** Frontend changes reload through the dev server; Rust changes trigger a rebuild and relaunch.

For a physical Android phone, enable Developer Options (open Settings, About, and tap Build Number seven times; the docs note that manufacturers may differ), turn on **USB Debugging**, connect the phone by USB, and run the same dev command.

## 8. Running on the iOS simulator, step by step

These steps come from the Tauri develop page and CLI help. They need a Mac with Xcode, CocoaPods and the iOS Rust targets.

1. Set the development team, either in `tauri.conf.json` (`"bundle": { "iOS": { "developmentTeam": "<TEAM_ID>" } }`) or with the `APPLE_DEVELOPMENT_TEAM` environment variable.
2. Initialize the Xcode project once (macOS):

   ```sh
   bun run tauri ios init
   ```

   ```sh
   npm run tauri ios init
   ```

3. Run the dev command (macOS). With no device connected, the CLI prompts you to pick a simulator; to skip the prompt, name it:

   ```sh
   bun run tauri ios dev "iPhone 15"
   ```

   ```sh
   npm run tauri ios dev "iPhone 15"
   ```

   The simulator name must match one installed in Xcode; `"iPhone 15"` is the docs' example.

4. For a physical iPhone, connect it, make sure the dev server honours `TAURI_DEV_HOST` (section 5), and run `bun run tauri ios dev` (or with `--open --host` to use Xcode).

The docs list one Xcode-specific pitfall: Tauri adds a build phase to the Xcode project that runs the Tauri CLI to compile the Rust code. That phase runs in Xcode's environment, which may not include shell changes such as `PATH` additions, so Node.js version managers may not work there.

## 9. Debugging on mobile

The web view's developer tools are reached differently on each platform. The steps below are exactly those on the develop page.

**Android (Chrome DevTools).** The inspector is enabled by default on emulators. On a physical device, enable Developer Mode and USB Debugging as in section 7. Then open Google Chrome on the host, go to `chrome://inspect`, find the device or emulator in the remote devices list while the app is running, and click **inspect** on its entry. The docs' WebView versions page adds that this is also how to check which Android System WebView (Chromium-based) version the device uses.

**iOS (Safari Web Inspector).** On the Mac, open Safari, choose **Safari > Settings**, click **Advanced**, and select **Show features for web developers**. On a physical device, also enable **Web Inspector** in the device's **Settings > Safari > Advanced**. A **Develop** menu then appears in Safari; select the device or simulator and click **localhost** to open the inspector.

**Native IDEs.** Running with `--open` opens Android Studio or Xcode, which the docs suggest for troubleshooting development issues with the IDE instead of the command line tools. The Tauri docs do not describe where Rust output and native logs appear on mobile, so specific log tools (such as `adb logcat` or the Xcode console) are not covered here (**UNVERIFIED**).

The general debugging techniques in `08-testing-debugging.md` (`#[cfg(dev)]`, `RUST_BACKTRACE`, the log plugin) also apply on mobile.

## 10. Testing on mobile

The testing levels in `08-testing-debugging.md` apply differently on mobile, as summarized below.

- **Frontend unit tests with IPC mocks** (`@tauri-apps/api/mocks`) run in a JavaScript test runner on the host and do not depend on the target platform, so they cover mobile frontend logic as well.
- **Rust tests** (`cargo test` in `src-tauri`) run on the host. Code behind `#[cfg(mobile)]` is not compiled in a host test run; the docs give no mobile-specific Rust test procedure.
- **End-to-end tests with WebDriver.** The docs state that WebdriverIO's Tauri service supports Windows, Linux and macOS, and that `tauri-driver` driven directly supports Windows and Linux. For mobile, the manual setup page says only: "iOS and Android work through Appium 2, but the process is not currently streamlined." (Appium is a separate open-source mobile automation tool.) There is therefore no documented, ready-made end-to-end setup for Tauri on Android or iOS. A practical plan is to keep logic testable with unit tests and IPC mocks and to run desktop end-to-end tests, then check mobile behaviour manually on an emulator and a simulator.

## 11. App icons on mobile

One command creates every icon, desktop and mobile, from a single square source image. Bun first, then npm (any host):

```sh
bun run tauri icon ./app-icon.png
```

```sh
npm run tauri icon ./app-icon.png
```

The input should be a square PNG or SVG with transparency; `./app-icon.png` is the default. Its useful options, from `tauri icon --help` (CLI 2.12.4), are listed below.

- `-o, --output <DIR>`: output folder (default: `icons` next to `tauri.conf.json`).
- `--ios-color <COLOR>`: background colour for iOS icons, which cannot be transparent (default `#fff`).
- `--fit cover|contain`: how to fit a non-square source; without it a non-square source is rejected.
- The input may instead be a JSON manifest with keys `default` (required), `bg_color`, `android_bg`, `android_fg`, `android_fg_scale` and `android_monochrome`, which control Android adaptive and themed icons separately.

Where mobile icons go depends on whether the native projects exist. The icons page says that mobile icons "will be placed into the Xcode and Android Studio projects directly", and the Google Play and App Store pages say to run `tauri icon` after `tauri android init` / `tauri ios init`. In a project without `src-tauri/gen/android` or `src-tauri/gen/apple`, running `tauri icon` wrote them to `src-tauri/icons/android/` and `src-tauri/icons/ios/` instead **(tested)**. So run `tauri icon` again after `init` to update the native projects.

The Android files produced in the test are listed below with their measured sizes **(tested)**; they go under `src-tauri/gen/android/app/src/main/res/` in an initialized project.

| Folder | `ic_launcher.png` and `ic_launcher_round.png` | `ic_launcher_foreground.png` |
| --- | --- | --- |
| `mipmap-mdpi` | 48 x 48 | 108 x 108 |
| `mipmap-hdpi` | 72 x 72 | 162 x 162 |
| `mipmap-xhdpi` | 96 x 96 | 216 x 216 |
| `mipmap-xxhdpi` | 144 x 144 | 324 x 324 |
| `mipmap-xxxhdpi` | 192 x 192 | 432 x 432 |

It also wrote `mipmap-anydpi-v26/ic_launcher.xml` (the adaptive icon definition) and `values/ic_launcher_background.xml` (background colour `#FFFFFF`). The icons page still lists `mipmap-hdpi` launcher icons as 49 x 49; the CLI changelog (PR #16101) says this was corrected to 72 x 72, which matches the test.

For iOS, the icons page says the PNGs must have no transparency and belong in `src-tauri/gen/apple/Assets.xcassets/AppIcon.appiconset/`. The test produced these files: `AppIcon-20x20@1x.png`, `@2x`, `@2x-1`, `@3x`; the same four for `29x29` and `40x40`; `AppIcon-60x60@2x.png` and `@3x`; `AppIcon-76x76@1x.png` and `@2x`; `AppIcon-83.5x83.5@2x.png`; and `AppIcon-512@2x.png`. The `-1` files are the "extra icon" copies the docs mention.

## 12. Checklist for adding mobile targets to a Tauri app

The ordered list below is the minimum sequence for an agent or a person enabling mobile in an existing desktop Tauri 2 app.

1. Install the Android prerequisites (section 2) and, on a Mac, the iOS prerequisites (section 3). Confirm `JAVA_HOME`, `ANDROID_HOME` and `NDK_HOME` are set in the shell that will run the CLI.
2. Confirm `Cargo.toml` has `[lib]` with `crate-type = ["staticlib", "cdylib", "rlib"]`, and that `lib.rs` has `#[cfg_attr(mobile, tauri::mobile_entry_point)] pub fn run()`.
3. Guard every desktop-only plugin: target-limited dependency in `Cargo.toml` and `#[cfg(desktop)]` around its registration and use in Rust (fix any unguarded line that `tauri add` inserted).
4. Give desktop-only permissions a capability with `"platforms": ["linux", "macOS", "windows"]`, and mobile-only permissions one with `"platforms": ["iOS", "android"]`.
5. Make the dev server honour `TAURI_DEV_HOST` (section 5).
6. Put mobile-only settings in `tauri.android.conf.json` / `tauri.ios.conf.json`; set `bundle.iOS.developmentTeam` or `APPLE_DEVELOPMENT_TEAM` for iOS.
7. Run `bun run tauri android init` (and `bun run tauri ios init` on macOS), then `bun run tauri icon`.
8. Start an emulator or simulator and run `bun run tauri android dev` / `bun run tauri ios dev`.

## Facts that could not be verified here

The items below are marked **UNVERIFIED** in the text because this session had no Android SDK and no Mac.

- Where Rust output and native logs appear on Android and iOS.
- Whether the iOS simulator runs without `developmentTeam` set.
- Whether the `--no-sign` and `--archive-only` flags of `tauri ios build` are present in the current CLI help.
- Android package-name restrictions on `identifier` beyond the schema rule, and whether changing `identifier` requires re-running `init`.
- Whether `src-tauri/gen/android` and `src-tauri/gen/apple` should be committed. The docs edit files inside them (for example `gen/android/app/build.gradle.kts` for signing), which suggests they are kept in the repository, but no page states a rule. Signing secrets such as `gen/android/keystore.properties` must never be committed in any case.
- `tauri android init` and the Android build itself were not run here; all Android steps come from the docs and CLI help.
