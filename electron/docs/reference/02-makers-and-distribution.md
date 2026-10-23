# Makers and distribution formats

Source pages:
- electron-forge/electron-forge-docs, commit `494fe76a3943` (2026-10-21): `config/makers/README.md`, `squirrel.windows.md`, `wix-msi.md`, `appx.md`, `msix.md`, `dmg.md`, `zip.md`, `deb.md`, `rpm.md`, `flatpak.md`, `snapcraft.md`, `pkg.md`; `cli.md`; `config/configuration.md`
- electron/forge source, commit `16d47dc29387` (2026-10-21): `packages/maker/*/src/*.ts` and `packages/maker/*/package.json` for every maker
- Installed package type definitions in a generated app: `electron-winstaller` 5.4.4 (`lib/options.d.ts`), `electron-installer-dmg` (types), `@electron/osx-sign` 2.7.1
- `npm view @electron-forge/maker-<name> version` for each maker (all 8.0.1)
- The template's `electron/template/forge.config.ts` and `README.md` in this repository

Verified on 2026-10-22

A **maker** is the Electron Forge component that takes the packaged app (the folder produced by `electron-forge package`) and turns it into a file users download, such as an installer or an archive. This file lists every maker Forge offers, what it builds, which operating system must run the build, its configuration keys and which packages to install. Signing is covered in `03-signing.md` and uploading in `04-publishing-and-updates.md`.

## 1. What the template already configures

The generated `forge.config.ts` declares four makers, shown in the table below with the options the template passes. Running `bun run make` (or `npm run make`) builds every maker that supports the current operating system, and writes the results under `out/make/`.

| Maker class | Package | Template options | Builds on |
| --- | --- | --- | --- |
| `MakerSquirrel` | `@electron-forge/maker-squirrel` | `name: "<app-slug>"`, `setupIcon: "assets/icon.ico"` | Windows |
| `MakerZIP` | `@electron-forge/maker-zip` | none; platforms limited to `["darwin", "linux"]` | macOS, Linux |
| `MakerDMG` | `@electron-forge/maker-dmg` | `icon: "assets/icon.icns"`; platforms `["darwin"]` | macOS |
| `MakerDeb` | `@electron-forge/maker-deb` | `options.name`, `productName`, `icon: "assets/icon.png"`, `categories: ["Utility"]`, `mimeType: ["x-scheme-handler/<scheme>"]` | Linux (needs `dpkg` and `fakeroot`) |

To add a maker, install its package as a development dependency, import its class in `forge.config.ts` and add an instance to the `makers` array. The commands below install a maker; replace `<name>` with the name from the table in section 3. They work on every operating system.

```bash
bun add -d @electron-forge/maker-<name>
```

```bash
npm install --save-dev @electron-forge/maker-<name>
```

A maker accepts its configuration object as the first constructor argument and an optional list of target platforms as the second, as in `new MakerZIP({}, ["darwin", "linux"])`. In the JavaScript object form, the same values are written as `config` and `platforms`; the configuration may also be a function of the target architecture, `(arch) => ({ ... })` (`makers/README.md`).

## 2. Platform names and cross-building

Forge uses Node's platform names: `win32` (Windows), `darwin` (macOS), `linux`, and `mas` (a Mac App Store build). The Forge CLI states that "you normally can only target platform X from platform X" (`cli.md`), so a release that covers three operating systems is built on three machines; `04-publishing-and-updates.md` shows the GitHub Actions matrix that does this. The `--arch` flag accepts `ia32`, `x64`, `armv7l`, `arm64`, `universal` and `mips64el`, comma-separated for several. The commands below build installers for the current platform and then for two Windows architectures (run the second on Windows).

```bash
bun run make
bun run make -- --arch="ia32,x64"
```

```bash
npm run make
npm run make -- --arch="ia32,x64"
```

The `--targets` flag overrides which makers run, using full package names, for example `--targets=@electron-forge/maker-zip`.

## 3. Every maker

The table below summarizes all Forge makers. "Default platforms" comes from each maker's `defaultPlatforms` in the Forge source; "Host check" is what the maker's `isSupportedOnCurrentPlatform()` tests before building; "External tools" are programs that must be installed on the build machine. All maker packages are at version 8.0.1 on npm.

| Maker (package suffix) | Builds | Default platforms | Host check in source | External tools |
| --- | --- | --- | --- | --- |
| `maker-squirrel` | `<App>-<version> Setup.exe`, `<name>-<version>-full.nupkg`, `RELEASES` (Squirrel.Windows installer) | `win32` | `electron-winstaller` is installed and `DISABLE_SQUIRREL_TEST` is not set | None on Windows; on Linux, `mono` and `wine` |
| `maker-wix` | `.msi` (Windows Installer) | `win32` | host is Windows | WiX Toolset **v3** |
| `maker-msix` | `.msix` package (direct download or Microsoft Store); **experimental** | `win32` | host is Windows | Windows 10/11 SDK (`makeappx.exe`, `makepri.exe`, `signtool.exe`) |
| `maker-appx` | Legacy Microsoft Store package; **deprecated** in source, now writes `.msix` | `win32` | host is Windows | Windows 10/11 SDK |
| `maker-dmg` | `.dmg` disk image | `darwin`, `mas` | host is macOS | none listed |
| `maker-pkg` | `.pkg` flat installer (needed for Mac App Store upload) | `darwin`, `mas` | host is macOS | none listed (signing identity in keychain) |
| `maker-zip` | `.zip` of the packaged app | `darwin`, `mas`, `win32`, `linux` | always true | none |
| `maker-deb` | `.deb` (Debian, Ubuntu) | `linux` | `electron-installer-debian` is installed | `dpkg` (checked), `fakeroot` (docs) |
| `maker-rpm` | `.rpm` (Fedora, Red Hat) | `linux` | `electron-installer-redhat` is installed | `rpmbuild` (checked) |
| `maker-flatpak` | Flatpak bundle (sandboxed Linux format) | `linux` | `@malept/electron-installer-flatpak` is installed | `flatpak`, `flatpak-builder`, `eu-strip` (from `elfutils`) |
| `maker-snap` | `.snap` (Snap Store format) | `linux` | host is Linux | `snapcraft` |

Each maker is described below in the same order, with its configuration keys. Keys listed come from the maker's TypeScript configuration type in the Forge source unless stated otherwise.

### 3.1 Squirrel.Windows (`@electron-forge/maker-squirrel`)

Squirrel.Windows is an installer framework that installs per user, without an administrator prompt, and supports automatic updates (`squirrel.windows.md`). The maker writes to `out/make/squirrel.windows/<arch>/`. Its configuration is the options of the `electron-winstaller` package except `appDirectory` and `outputDirectory`. The keys found in `electron-winstaller` 5.4.4 are listed below.

- Identity and metadata: `name` (NuGet package name; no spaces; the maker defaults it to `package.json` `name` with `-` replaced by `_`), `title`, `authors`, `owners`, `description`, `copyright`, `version`, `exe` (defaults to `<executableName>.exe`), `usePackageJson`, `nuspecTemplate`.
- Installer appearance: `setupIcon`, `iconUrl`, `loadingGif`, `setupExe` (defaults to `<appName>-<version> Setup.exe`), `setupMsi`, `noMsi` (the maker sets `true`), `skipUpdateIcon`.
- Updates: `remoteReleases` (URL of earlier releases, used to build delta packages), `remoteToken`, `noDelta`.
- Signing: `windowsSign` (recommended), and the legacy `certificateFile`, `certificatePassword`, `signWithParams` (see `03-signing.md`).
- Other: `vendorDirectory`, `frameworkVersion`, `fixUpPaths`.

Squirrel requires `author` and `description` in `package.json` (or `authors` and `description` in the maker config) to write its `.nuspec` manifest. If the app name contains spaces, the docs recommend a camel-case `name` in the maker config and calling `app.setAppUserModelId("com.squirrel.AppName.AppName")`; the template instead sets `name` to the app's slug and calls `app.setAppUserModelId(appConfig.appId)`. The app must quit when started by the installer with special arguments; the template does this with `electron-squirrel-startup` in `src/main/main.ts`. Debug logging: set `DEBUG=electron-windows-installer*`.

### 3.2 WiX MSI (`@electron-forge/maker-wix`)

Builds a traditional `.msi` installer, which Forge recommends only when enterprise distribution policies require MSI (`wix-msi.md`). Output goes to `out/make/wix/<arch>/`. Install WiX Toolset v3 on the Windows build machine; the docs recommend pinning the version with Chocolatey (a Windows package manager), run in an administrator shell on Windows:

```powershell
choco install wixtoolset --version=3.14.0
```

Forge-defined keys: `name`, `description`, `version` (must be valid semantic versioning; pre-release parts are dropped with a warning because MSI uses `major.minor.build.revision`), `manufacturer` (defaults to `package.json` `author`), `exe`, and `beforeCreate(creator)`, a hook that can modify the underlying `MSICreator` object. All other keys come from `electron-wix-msi`'s `MSICreatorOptions`; the docs show `language: 1033`. The Electron code-signing tutorial states that `electron-wix-msi` accepts the same `windowsSign` options. Debug logging: `DEBUG=electron-wix-msi*`.

### 3.3 MSIX (`@electron-forge/maker-msix`)

Builds an `.msix` package that can be given to users directly or submitted to the Microsoft Store. The docs mark it **experimental** since Forge 7.10, with possible breaking configuration changes (`msix.md`). It uses the `electron-windows-msix` package. Forge-defined keys: `manifestVariables` (with `publisher`, `packageDescription`, `appExecutable`, `packageVersion`, `packageIdentity` and `targetArch` given defaults by Forge), `outputFileName` (string or function returning the file's base name), and every other `electron-windows-msix` packaging option except `outputDir` and `appDir`. Signing uses `windowsSignOptions`, passed to `@electron/windows-sign`. Debug logging: `DEBUG=electron-windows-msix*`, or `logLevel: "debug"`.

### 3.4 AppX (`@electron-forge/maker-appx`)

The docs describe AppX as a Microsoft Store format built with `electron-windows-store`. **The Forge source at commit `16d47dc29387` disagrees:** `MakerAppX` is marked `@deprecated` with "Use `@electron-forge/maker-msix` instead", it is now a compatibility layer over `electron-windows-msix`, and it writes a `.msix` file (not `.appx`) to `out/make/appx/<arch>/`. The keys it still honours are `packageVersion`, `packageName`, `packageDisplayName`, `packageDescription`, `packageBackgroundColor`, `packageExecutable`, `assets` (must contain `icon.png`, `Square44x44Logo.png` and `Square150x150Logo.png`), `manifest`, `publisher` (must match the certificate subject, e.g. `CN=developmentca`), `windowsKit`, `devCert`, `certPass`, `signtoolParams`, `makePri` and `makeVersionWinStoreCompatible`. The keys `containerVirtualization`, `flatten`, `deploy`, `desktopConverter`, `expandedBaseImage`, `makeappxParams`, `createConfigParams`, `createPriParams` and `finalSay` are ignored with a warning. Without `devCert`, a self-signed development certificate is generated next to the package. New projects should use the MSIX maker.

### 3.5 DMG (`@electron-forge/maker-dmg`)

Builds an Apple Disk Image, the usual way to hand a macOS app to users; the window invites the user to drag the app into `/Applications` (`dmg.md`). Output: `out/make/dmg/<arch>/<appName>-<version>-<arch>.dmg`, or `<name>.dmg` in the same folder when `name` is set. Keys are those of `electron-installer-dmg` except `appPath` and `out`: `name`, `title`, `background`, `icon`, `iconSize`, `overwrite`, `contents`, `format` (`UDRW`, `UDRO`, `UDCO`, `UDZO`, `UDBZ` or `ULFO`) and `additionalDMGOptions`. A DMG alone cannot be used for automatic updates; Forge's docs say to also build the ZIP maker for macOS updates. Debug logging: `DEBUG=electron-installer-dmg*`.

### 3.6 pkg (`@electron-forge/maker-pkg`)

Builds a macOS flat installer package (`.pkg`), which is what the Mac App Store accepts and an alternative to a DMG outside it (`pkg.md`). It only accepts the `darwin` and `mas` target platforms and writes `out/make/pkg/<arch>/<name>.pkg`. Keys: `name` (default `<appName>-<version>-<arch>`), `identity` (installer signing certificate name), `identityValidation` (default `true`), `install` (install location, default `/Applications`), `keychain`, and `scripts` (a folder holding extension-less, executable `preinstall` and/or `postinstall` scripts). When `identity` is set and `packagerConfig.osxNotarize` exists, the maker also notarizes the `.pkg`. Installer logs are in `/var/log/install.log`. Debug logging: `DEBUG=electron-osx-sign*`.

### 3.7 ZIP (`@electron-forge/maker-zip`)

Builds a `.zip` of the packaged app on any operating system, writing `out/make/zip/<platform>/<arch>/<folder>-<version>.zip` (`zip.md`). Keys: `macUpdateManifestBaseUrl` and `macUpdateReleaseNotes`. When the base URL is set for a `darwin` build, the maker downloads the existing `RELEASES.json` from that URL, adds the new version and writes the updated manifest; this is how static-file updates work on macOS (`04-publishing-and-updates.md`).

### 3.8 deb (`@electron-forge/maker-deb`)

Builds a Debian package. It runs on Linux or macOS with `fakeroot` and `dpkg` installed (`deb.md`). All keys sit under `options`: `name`, `productName`, `genericName`, `description`, `productDescription`, `version`, `revision`, `section`, `priority`, `size`, `depends`, `recommends`, `suggests`, `enhances`, `preDepends`, `maintainer`, `homepage`, `bin`, `icon`, `categories`, `mimeType`, `lintianOverrides`, `scripts` (`preinst`, `postinst`, `prerm`, `postrm`), `desktopTemplate` and `copyright`. The template's `mimeType: ["x-scheme-handler/<scheme>"]` registers the deep-link scheme on Linux. The command below installs the build tools (Debian or Ubuntu, from the template's `README.md`).

```bash
sudo apt install dpkg fakeroot
```

### 3.9 RPM (`@electron-forge/maker-rpm`)

Builds an `.rpm` package on Linux with `rpm-build` (Fedora) or `rpm` (Debian, Ubuntu) installed (`rpm.md`). All keys sit under `options`: `name`, `productName`, `genericName`, `description`, `productDescription`, `version`, `revision`, `license`, `copyright`, `group`, `requires`, `homepage`, `compressionLevel` (0–9), `bin`, `execArguments`, `icon`, `categories` and `mimeType`. Install the tools with one of these commands:

```bash
# Fedora
sudo dnf install rpm-build
# Debian or Ubuntu
sudo apt-get install rpm
```

### 3.10 Flatpak (`@electron-forge/maker-flatpak`)

Builds a Flatpak, a Linux format that runs the app in a sandbox (`flatpak.md`). Install `flatpak`, `flatpak-builder` and `elfutils` (for `eu-strip`) with the distribution's package manager, then add the Flathub repository, which supplies the runtimes (any Linux distribution):

```bash
flatpak remote-add --if-not-exists --user flathub https://dl.flathub.org/repo/flathub.flatpakrepo
```

All keys sit under `options`: `id` (default `io.atom.electron`), `productName`, `genericName`, `description`, `branch`, `base`, `baseVersion`, `baseFlatpakref`, `runtime`, `runtimeVersion`, `sdk`, `finishArgs`, `files` (list of `[source, destination]` pairs), `modules`, `bin`, `icon`, `categories` and `mimeType`. Set `id` to the app identifier; the default belongs to another project.

### 3.11 Snapcraft (`@electron-forge/maker-snap`)

Builds a `.snap`, Canonical's sandboxed package format used by the Snap Store, on Linux with `snapcraft` installed (`snapcraft.md`). Its configuration type combines the `Options` and `SnapcraftConfig` types of `electron-installer-snap` (except `arch`, `dest` and `src`). The keys shown in the docs are `summary` and `features` (with `audio`, `mpris` and `webgl`); the full key list is in the `electron-installer-snap` package, which was not read for this file (**UNVERIFIED** beyond those keys).

## 4. Choosing makers for this template

The template's four makers give every desktop user an installer: Squirrel for Windows, DMG plus ZIP for macOS (the ZIP is what macOS updates download), and deb plus ZIP for Linux. The list below names the usual reasons to add another maker.

1. Add **WiX MSI** when an organization's IT department requires `.msi` installers.
2. Add **MSIX** for Microsoft Store distribution (`05-app-stores.md`).
3. Add **pkg** and build with `--platform=mas` for the Mac App Store (`05-app-stores.md`).
4. Add **RPM** for Fedora and Red Hat users; add **Flatpak** or **Snap** for sandboxed, store-based Linux distribution.

Each new maker needs its external tools on the CI runner that builds it, so update the release workflow at the same time.
