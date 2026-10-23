# App stores

Source pages:
- electron/electron docs folder, commit `c80c71c7c6b1` (2026-10-22): `docs/tutorial/mac-app-store-submission-guide.md`, `docs/tutorial/windows-store-guide.md`, `docs/tutorial/snapcraft.md`, `docs/tutorial/code-signing.md`, `docs/tutorial/asar-integrity.md`
- electron-forge/electron-forge-docs, commit `494fe76a3943` (2026-10-21): `config/makers/pkg.md`, `appx.md`, `msix.md`, `snapcraft.md`; `config/publishers/snapcraft.md`; `guides/code-signing/code-signing-macos.md`; `cli.md`
- electron/forge source, commit `16d47dc29387`: `packages/maker/pkg/src/MakerPKG.ts`, `packages/maker/appx/src/MakerAppX.ts` and `Config.ts`, `packages/maker/msix/src/Config.ts`, `packages/maker/dmg/src/MakerDMG.ts`
- Installed `@electron/osx-sign` 2.7.1 type definitions in a generated app
- This repository: `electron/template/forge.config.ts`, `electron/modules/auto-update/`

Verified on 2026-10-22

An **app store** is an operating-system vendor's catalogue from which users install software; the store reviews, signs or hosts the app and usually delivers its updates. This file covers the three stores Electron Forge can target: the Mac App Store, the Microsoft Store and the Snap Store. For each it states the account needed, the build configuration, and the restrictions that commonly cause a rejected or broken build. The generated template targets none of them by default; every step here is an addition.

## 1. Mac App Store (MAS)

### 1.1 Account and certificates

The Mac App Store requires an **Apple Developer Program** membership and Xcode 11 or newer (`mac-app-store-submission-guide.md`). The list below gives the certificates that guide names for store builds; they differ from the Developer ID certificate used for direct downloads (`03-signing.md`).

- **Apple Development**: signs builds that run only on Macs registered in the developer account, for testing before submission.
- **Apple Distribution**: signs the build submitted to the store. A build signed with it does not run until Apple re-signs it, which happens only when it is downloaded from the store. Older names for this certificate are "3rd Party Mac Developer Application" and "Mac App Distribution".
- **Mac Installer Distribution**: signs the `.pkg` installer that is uploaded.

The guide's simplest way to obtain the first two is Xcode, Settings, Accounts, Manage Certificates, then the add (+) button.

### 1.2 The MAS build of Electron and App Sandbox

Store apps must run under **App Sandbox**, Apple's restriction of what an app may access. Only the special "MAS build" of Electron can run under App Sandbox; the normal macOS build fails to launch there. In Forge the MAS build is selected with the `mas` target platform (`cli.md`), on a macOS machine. The commands below package and make a MAS build (macOS only).

```bash
bun run make -- --platform=mas
```

```bash
npm run make -- --platform=mas
```

The MAS build disables `crashReporter` and `autoUpdater`, may break video capture on some machines and some accessibility features, and does not notice DNS changes. In this template, the `auto-update` module must therefore not be enabled for a store build (the store delivers updates). The `crash-reporting` module is built on `@sentry/electron`; how that package behaves without Electron's `crashReporter` was not checked (**UNVERIFIED**). ASAR integrity is fully supported in MAS builds and recommended (`asar-integrity.md`).

### 1.3 Provisioning profile

A **provisioning profile** is a file from Apple that ties an app identifier, certificates and (for development) specific Macs together. To test a store-signed build locally, the guide's steps are, in order:

1. Open "Certificates, Identifiers & Profiles" in the Apple Developer website.
2. Add an App ID for the app on the Identifiers page. Use the plan's `appId` (the template's `packagerConfig.appBundleId`).
3. Register the Mac on the Devices page, using the "Device ID" shown in System Information, Hardware.
4. Create a profile on the Profiles page and download it, for example as `assets/development.provisionprofile`.

`@electron/osx-sign` takes the path as `provisioningProfile` and embeds it by default (`preEmbedProvisioningProfile` is `true`; without a path it looks for a `.provisionprofile` file in the working directory).

### 1.4 Entitlements

**Entitlements** are capabilities written into the signature. When signing with `@electron/osx-sign` (which Forge uses), the App Sandbox entitlements, the `com.apple.security.application-groups` entry and the `ElectronTeamID` key in `Info.plist` are added automatically. The list below gives the additional entitlements the guide names for common Electron features; each is a `<key>` set to `<true/>` in the entitlements `.plist`.

- `com.apple.security.network.client`: outgoing network connections (needed by any app that calls a server, including this template's sign-in and remote profile).
- `com.apple.security.network.server`: listening for incoming connections.
- `com.apple.security.files.user-selected.read-only`: files chosen with `dialog.showOpenDialog`.
- `com.apple.security.files.user-selected.read-write`: files chosen with `dialog.showSaveDialog` (the template's `filesystem` module uses both dialogs).

Provide one entitlements file for the app bundle and a child file for helper executables, frameworks and libraries, and return the right one per file from `optionsForFile`.

### 1.5 Forge configuration sketch

The sketch below shows where each store setting goes in `forge.config.ts`. It combines keys documented in the sources above; it has not been built in this repository (**UNVERIFIED** as a whole), and the identity strings must match the certificates installed in the keychain. The `pkg` maker signs the installer with `identity` and only accepts `darwin` and `mas` targets; it notarizes only when `osxNotarize` is also set, which a store build does not need.

```ts
import { MakerPKG } from "@electron-forge/maker-pkg";

// packagerConfig, for a build made with --platform=mas:
osxSign: {
  identity: "Apple Distribution",            // or the full certificate name
  provisioningProfile: "assets/embedded.provisionprofile",
  optionsForFile: (filePath) => ({ entitlements: "assets/entitlements.mas.plist" }),
},

// makers:
new MakerPKG({ identity: "<installer certificate name from the keychain>" }, ["mas"]),
```

The installer certificate is the one the Electron guide calls "Mac Installer Distribution". The exact name string Apple gives it in the keychain was not checked (**UNVERIFIED**); read it on the build Mac with `security find-identity -v` and copy it into `identity`.

### 1.6 Upload and review

Create the app's record in App Store Connect first, upload the signed `.pkg` with Apple's **Transporter** app, then submit for review. If review reports private API use, the build is probably not the MAS build of Electron. Depending on the countries of release, export-compliance questions about encryption must be answered; the guide lists the cryptographic algorithms Electron contains.

## 2. Microsoft Store

### 2.1 Package format and the conflicting sources

The Microsoft Store accepts packaged desktop apps. The three sources disagree on the tool to use, so the list below states what each says.

1. Electron's `windows-store-guide.md` describes `.appx` packages built with the `electron-windows-store` command-line tool, requiring Windows 10 Anniversary Update and the Windows 10 SDK, run from an administrator PowerShell, and optionally the Desktop App Converter.
2. Forge's `appx.md` describes `@electron-forge/maker-appx` built on `electron-windows-store`.
3. The Forge **source** at commit `16d47dc29387` deprecates `maker-appx`, rebuilds it on `electron-windows-msix`, makes it output `.msix`, and points to `@electron-forge/maker-msix`. Forge's `msix.md` says the MSIX maker builds packages for direct download or the Microsoft Store and is **experimental** since Forge 7.10.

Because the Forge source is the code that will actually run, use **`@electron-forge/maker-msix`** for new store work and treat the `electron-windows-store` instructions as historical.

### 2.2 Building

The MSIX maker runs only on Windows 10 or 11 with the Windows SDK (which supplies `makeappx.exe`, `makepri.exe` and `signtool.exe`). The commands below add it (any operating system); then add `new MakerMSIX({...})` to `makers` in `forge.config.ts`.

```bash
bun add -d @electron-forge/maker-msix
```

```bash
npm install --save-dev @electron-forge/maker-msix
```

The docs' example sets `manifestVariables.publisher` and signs with `windowsSignOptions: { certificateFile, certificatePassword }`. The `publisher` value is an X.500 name such as `CN=Example Ltd` and must match the subject of the signing certificate (`Config.ts` of the AppX maker states this rule for the shared MSIX tooling).

### 2.3 Gotchas

The list below collects the restrictions stated in the sources.

- **Version format.** Store packages use a four-part `X.Y.Z.A` version. The AppX compatibility layer defaults `packageVersion` to `<package.json version>.0` and offers `makeVersionWinStoreCompatible` to strip pre-release and build metadata instead of failing.
- **Assets.** A custom assets folder for the AppX layer must contain `icon.png`, `Square44x44Logo.png` and `Square150x150Logo.png`, or `makeappx.exe` refuses to pack.
- **Development certificate.** Without a certificate, a self-signed development certificate is generated next to the package (`dev_cert.cer`, `dev_cert.pfx`) for trusting on a test device only.
- **Still a Win32 app.** Electron's guide notes the package still contains a Win32 executable, so it will not run on Xbox, HoloLens or phones; packages can also be installed outside the store by double-clicking or with the `Add-AppxPackage` PowerShell command.

### 2.4 Account

The Electron and Forge sources read for this file do not describe the Microsoft developer account, its cost or the submission portal. Registering as a Microsoft Store developer and submitting through Microsoft's partner portal is required (**UNVERIFIED**: details not checked against Microsoft's documentation).

## 3. Snap Store

### 3.1 Building and publishing

Snaps are containerized Linux packages that bundle their dependencies, update automatically and run on the major distributions (`snapcraft.md` in the Electron docs). Forge builds them with `@electron-forge/maker-snap` and uploads them with `@electron-forge/publisher-snapcraft`; both need Linux with the `snapcraft` tool installed. The commands below add both packages (any operating system).

```bash
bun add -d @electron-forge/maker-snap @electron-forge/publisher-snapcraft
```

```bash
npm install --save-dev @electron-forge/maker-snap @electron-forge/publisher-snapcraft
```

The maker's documented keys are `summary` and `features` (`audio`, `mpris`, `webgl`); the publisher's key is `release`, the list of channels such as `"[latest/edge, insider/stable]"`. All package configuration is done in the maker.

### 3.2 Gotchas

The list below collects points from the Electron snapcraft guide's hand-written `snapcraft.yaml` example. They describe what a working Electron snap needs; the Forge maker generates its own configuration, and whether it sets each of these was not checked (**UNVERIFIED**).

- The example uses `confinement: strict` with the plugs `browser-support`, `network` and `network-bind`, and the `gnome` extension.
- It starts the app with `--no-sandbox` and sets `TMPDIR: $XDG_RUNTIME_DIR` so that the tray library can read its resources.
- It stages `libnss3` and `libnspr4`.
- A locally built snap installs only with `sudo snap install <file>.snap --dangerous`, because it is not signed by the store.

### 3.3 Account

Publishing needs a Snap Store developer account, and `snapcraft` must be logged in to it on the publishing machine. Neither the Forge nor the Electron sources describe the login step (**UNVERIFIED**).

## 4. Summary

The table below compares the three stores.

| Store | Build host | Forge packages | Signing | Updates |
| --- | --- | --- | --- | --- |
| Mac App Store | macOS, `--platform=mas` | `maker-pkg` | Apple Distribution (app), Mac Installer Distribution (`.pkg`); no notarization | By the store; `autoUpdater` disabled |
| Microsoft Store | Windows 10/11 with Windows SDK | `maker-msix` (experimental) | Certificate whose subject matches `publisher` | By the store |
| Snap Store | Linux with `snapcraft` | `maker-snap`, `publisher-snapcraft` | Handled by the store | By the store |
