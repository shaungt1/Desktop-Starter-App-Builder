# Release and signing

This document explains how a generated app becomes installers, how those
installers are signed so operating systems trust them, and how updates reach
users. Signing needs certificates and accounts that only the app's owner can
obtain, so the builder configures the hooks and leaves the credentials to you.
Publishing a release is always an explicit, approved action.

## Building installers

From the builder, `bash start.sh release <app>` runs the app's quality gate and
then builds installers for the operating system it runs on. The same commands
can be run inside the app; the table below shows them and where the output goes.

| Base | Command in the app | Output | Formats per operating system |
| --- | --- | --- | --- |
| Electron | `bun run make` | `out/make/` | Windows: Squirrel `Setup.exe`; macOS: DMG and ZIP; Linux: DEB and ZIP |
| Tauri | `bun run build:app` | `src-tauri/target/release/bundle/` | Windows: MSI and NSIS `-setup.exe`; macOS: `.app` and DMG; Linux: DEB, RPM and AppImage |

Installers are built on the operating system they target. The CI workflow in
`.github/workflows/ci.yml` shows the three-runner matrix.

## Signing

Unsigned apps install, but Windows shows a SmartScreen warning and macOS
Gatekeeper refuses to open apps that are not signed and notarized (scanned and
approved by Apple). Linux packages are not code-signed; AppImages are commonly
accompanied by a detached GPG signature.

**macOS** needs a paid Apple Developer account and a "Developer ID Application"
certificate. Set these environment variables in the shell or CI secrets that
build the release (they are listed in the app's `.env.example`):

| Variable | Electron | Tauri |
| --- | --- | --- |
| `APPLE_SIGNING_IDENTITY` | Turns on signing and notarization in `forge.config.ts` | Signing identity |
| `APPLE_ID`, `APPLE_PASSWORD` (app-specific password), `APPLE_TEAM_ID` | Used for notarization | Used for notarization |
| `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD` | Not used (the certificate must be in the keychain) | Base64 certificate for CI |

**Windows** needs a code-signing certificate, which certificate authorities now
issue only on hardware tokens or through cloud signing services. Electron:
add `certificateFile` and `certificatePassword` (or a `signWithParams` command
for cloud signing) to the `MakerSquirrel` options in `forge.config.ts`. Tauri:
set the certificate thumbprint or a `signCommand` under `bundle.windows` in
`tauri.conf.json`, as described in `tauri/docs/reference/07-distribute.md`.
Neither is configured by default because the values depend on your certificate.

## Publishing

**Electron:** `bun run publish` builds and uploads a **draft** GitHub release to
the repository named in the plan, using `GITHUB_TOKEN`. Review and publish the
draft on GitHub. From the builder, `bash start.sh release <app> --publish`
asks for confirmation first; `--yes` confirms non-interactively for that one run.

**Tauri:** releases are built per operating system in CI with the
`tauri-apps/tauri-action` GitHub Action, which uploads the bundles to a GitHub
release and can write the update manifest. `release --publish` is therefore
refused for Tauri apps; build locally without `--publish`, or push a tag that
your CI workflow releases.

## Updates

**Electron, `auto-update` module.** Built on Electron's own updater through
`update-electron-app`. With `source: "github"` the free update.electronjs.org
service reads releases of a **public** GitHub repository. With
`source: "static"` and a `baseUrl`, it reads from any file host (S3, R2, a web
server) where you upload the contents of `out/make` under `<baseUrl>/<platform>/<arch>/`
for each release; this works for private apps. Windows and macOS update
themselves; Linux packages update through the system package manager.

**Tauri, `auto-update` module.** Every update is verified against a public key
compiled into the app before it is installed. Set it up once:

1. Generate a key pair: `bun run tauri signer generate -w ~/.tauri/<app>.key`.
   Keep the private key safe; losing it means installed copies can never update again.
2. Put the public key in the plan as `moduleOptions["auto-update"].pubkey` and the
   manifest URL as `moduleOptions["auto-update"].endpoint`, for example the
   `latest.json` asset of your latest GitHub release.
3. Set `"createUpdaterArtifacts": true` under `"bundle"` in `src-tauri/tauri.conf.json`.
4. Build releases with `TAURI_SIGNING_PRIVATE_KEY` (and
   `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` if the key has one) in the environment.
   The build then writes `.sig` files next to the installers, and the manifest
   lists each platform's download URL and signature.

## Release checklist

Before each release, confirm the following, in order:

1. The version in `package.json` (and, for Tauri, `src-tauri/tauri.conf.json`
   and `src-tauri/Cargo.toml`) is increased.
2. `bun run verify` and `bun run test:e2e` pass.
3. Signing variables are present for the platforms being released.
4. The update feed (GitHub release, static host or manifest) is updated after
   the installers are uploaded, never before.
5. A clean machine installs the new version and an existing install updates to it.
