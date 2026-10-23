# Publishing, automatic updates and the release workflow

Source pages:
- electron-forge/electron-forge-docs, commit `494fe76a3943` (2026-10-21): `config/publishers/README.md`, `github.md`, `s3.md`, `gcs.md`, `electron-release-server.md`, `bitbucket.md`, `nucleus.md`, `snapcraft.md`; `advanced/auto-update.md`; `config/makers/zip.md`, `squirrel.windows.md`; `.gitbook/includes/static-file-auto-updates-wi....md`; `cli.md`; `core-concepts/why-electron-forge.md`
- electron/forge source, commit `16d47dc29387`: `packages/publisher/*/src/Config.ts`, `packages/publisher/github/src/PublisherGitHub.ts`, `packages/publisher/github/src/util/github.ts`, `packages/publisher/base-static/src/PublisherStatic.ts`, `packages/publisher/bitbucket/src/PublisherBitbucket.ts`
- electron/electron docs folder, commit `c80c71c7c6b1`: `docs/tutorial/updates.md`, `docs/tutorial/mac-app-store-submission-guide.md` (MAS limitations)
- This repository: `electron/modules/auto-update/src/main/modules/auto-update/index.ts`, `electron/template/forge.config.ts`, `electron/template/package.json`, `electron/template/README.md`, `.github/workflows/ci.yml`, `docs/RELEASE_AND_SIGNING.md`
- https://github.com/actions/checkout and https://github.com/actions/checkout/releases (fetched 2026-10-22)
- https://github.com/actions/setup-node and https://github.com/actions/setup-node/releases (fetched 2026-10-22)
- https://github.com/oven-sh/setup-bun and https://github.com/oven-sh/setup-bun/releases (fetched 2026-10-22)
- https://github.com/Apple-Actions/import-codesign-certs (fetched 2026-10-22)
- https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets (fetched 2026-10-22)
- `npm view` for `@electron-forge/publisher-*` (8.0.1) and `update-electron-app` (3.3.0)

Verified on 2026-10-22

A **publisher** is the Electron Forge component that uploads the files built by the makers to a place users or update services download them from (`publishers/README.md`). This file lists every Forge publisher, explains the automatic-update options that work with Forge's output, and gives a complete GitHub Actions workflow that builds, checks and publishes a release on Windows, macOS and Linux. It extends the "Publishing" and "Updates" sections of `docs/RELEASE_AND_SIGNING.md`.

## 1. What the template already configures

The generated `forge.config.ts` adds one publisher when the plan has a `repository` value (`owner/name`), as shown below; otherwise the publisher list is empty and `bun run publish` has nowhere to upload.

```ts
publishers:
  repositoryOwner && repositoryName
    ? [new PublisherGitHub({ repository: { owner: repositoryOwner, name: repositoryName }, draft: true })]
    : [],
```

`bun run publish` runs `electron-forge publish`, which packages, makes and then publishes in one step. The `--dry-run` flag builds and saves the results without uploading, and `--from-dry-run` uploads saved results later (`cli.md`). The commands below show both forms on any operating system.

```bash
bun run publish
bun run publish -- --dry-run
bun run publish -- --from-dry-run
```

```bash
npm run publish
npm run publish -- --dry-run
npm run publish -- --from-dry-run
```

## 2. Every publisher

All publishers default to publishing every platform; a `platforms` list restricts them. The table below lists each Forge publisher, where it uploads, its configuration keys (from the Forge source) and how it authenticates. All packages are at version 8.0.1.

| Publisher package | Uploads to | Configuration keys | Authentication |
| --- | --- | --- | --- |
| `@electron-forge/publisher-github` | GitHub Releases | `repository: { owner, name }` (required), `authToken`, `octokitOptions` (for GitHub Enterprise hosts), `prerelease`, `draft`, `tagPrefix` (default `"v"`), `force`, `generateReleaseNotes` | `authToken`, else the `GITHUB_TOKEN` environment variable; needs write access to repository contents |
| `@electron-forge/publisher-s3` | Amazon S3 bucket (or an S3-compatible `endpoint`) | `bucket`, `folder`, `public`, `omitAcl`, `endpoint`, `region`, `keyResolver`, `releaseFileCacheControlMaxAge`, `accessKeyId`, `secretAccessKey`, `sessionToken` | The AWS SDK's standard credential sources (the docs recommend them over the key options) |
| `@electron-forge/publisher-gcs` | Google Cloud Storage bucket | `storageOptions` (passed to the Storage SDK), `bucket`, `folder`, `uploadOptions`, `keyResolver`, `metadataGenerator` | Google client-library authentication |
| `@electron-forge/publisher-electron-release-server` | An Electron Release Server instance (community project) | `baseUrl`, `username`, `password`, `channel`, `flavor` | Username and password |
| `@electron-forge/publisher-nucleus` | A Nucleus update server | `host`, `appId`, `channelId`, `token` | `token` |
| `@electron-forge/publisher-bitbucket` | The Downloads tab of a Bitbucket Cloud repository | `repository: { owner, name }`, `auth: { username, appPassword }`, `replaceExistingFiles` | `BITBUCKET_USERNAME` and `BITBUCKET_APP_PASSWORD` environment variables are also read |
| `@electron-forge/publisher-snapcraft` | Snap Store | `release` (channels, for example `"[latest/edge, insider/stable]"`) | Runs on Linux with `snapcraft` installed (`05-app-stores.md`) |

Three behaviours matter when choosing between them. First, the **GitHub publisher** creates the release named `<tagPrefix><package.json version>` (for example `v1.2.0`) if it does not exist, as a **draft unless `draft: false`**, and otherwise uploads into the existing one; it finds the existing release by listing the repository's releases and matching the tag. Second, **S3** stores each file at `<folder>/<platform>/<arch>/<file name>`, where `folder` defaults to the `package.json` `name`; publishing the same version twice for the same platform can overwrite files, which `keyResolver` avoids. Third, **GCS** stores files at `<folder or version>/<file name>`.

## 3. Automatic updates

Electron's built-in updater is the `autoUpdater` module, which uses the **Squirrel** framework: Squirrel.Windows on Windows and Squirrel.Mac on macOS (`updates.md`). Forge's own auto-update guide describes three ways to feed it, all of which work with Forge's makers and publishers. The list below describes them; they are the only update mechanisms the Forge and Electron documentation present for Forge-built apps.

1. **update.electronjs.org (free service).** For apps whose GitHub repository is **public**, whose builds are published to GitHub Releases, which run on macOS or Windows, and which are code-signed on macOS. Use the GitHub publisher and the `update-electron-app` package (version 3.3.0 on npm), which by default checks at start-up and then every ten minutes, downloads in the background and asks the user to restart.
2. **Static file storage.** For private apps. Build the ZIP maker with `macUpdateManifestBaseUrl` (macOS) and the Squirrel maker with `remoteReleases` (Windows), publish to S3 (or another static host) in the `<platform>/<arch>/` layout, and point `update-electron-app` at it with `updateSource: { type: UpdateSourceType.StaticStorage, baseUrl }`. A DMG alone cannot be updated; the ZIP is what Squirrel.Mac downloads.
3. **Your own update server.** Hazel and Nuts read GitHub Releases (use the GitHub publisher); Electron Release Server and Nucleus have their own publishers. The app calls `autoUpdater.setFeedURL({ url })` with `<server>/update/<platform>/<version>`. A Squirrel.Windows client expects the `RELEASES` file at `<feed>/RELEASES`; a Squirrel.Mac client expects JSON with a `url` to the ZIP, or HTTP 204 when there is no update.

Three limits apply in every case. macOS updates require a signed app (`advanced/auto-update.md`); `autoUpdater` is disabled in Mac App Store builds; and Linux `.deb` and `.rpm` installs are updated by the system package manager, not by `autoUpdater`.

**About `electron-updater`.** The Forge and Electron documentation read for this file do not mention `electron-updater`. Forge's documentation describes Electron Builder as an alternative build tool that "rewrites its own in-house logic", whereas Forge combines first-party Electron tools. Forge's update paths are the Squirrel-based ones above; do not add `electron-updater` to a Forge app on the strength of this documentation.

**What the template's `auto-update` module does.** The optional module (`electron/modules/auto-update/`) calls `updateElectronApp` only in a packaged app on Windows or macOS. With `moduleOptions["auto-update"].source = "github"` (default) it uses update.electronjs.org with the plan's `repository`; with `source: "static"` and `baseUrl` it appends `/<platform>/<arch>` and uses static storage. `interval` defaults to `"1 hour"`. Its state is readable from the interface through `ipc.autoUpdate.status()`.

## 4. GitHub Actions release workflow

### 4.1 What the workflow must do and why

Installers are built on the operating system they target (`02-makers-and-distribution.md`), so the workflow runs on three GitHub-hosted runners: `windows-latest`, `macos-latest` and `ubuntu-latest`. Each runner installs Bun (which installs packages and runs scripts) and Node.js (which runs the Forge command-line tool, per the template's `README.md`), runs the quality gate `bun run verify`, and then runs `bun run publish`. The list below gives the design decisions and their reasons.

1. **Trigger.** A pushed tag starting with `v`, or a manual run. The tag must equal `v` plus the `package.json` version, because the GitHub publisher names the release from that version.
2. **Permissions.** `contents: write`, which the Forge GitHub docs say `GITHUB_TOKEN` needs to create releases.
3. **Two jobs.** `verify` runs on all three runners in parallel. `publish` runs after it, with `max-parallel: 1`, so the three runners publish one after another. The publisher looks up the release by listing releases and creates it when none matches; running the three uploads at once could let two runners each create a draft. Running them in sequence lets the second and third runner find the draft the first created. (Whether GitHub's release listing includes drafts for the workflow token was not checked against GitHub's API documentation: **UNVERIFIED**; the template's `docs/RELEASE_AND_SIGNING.md` already relies on draft releases.)
4. **Secrets in conditions.** GitHub states that secrets "cannot be directly referenced in `if:` conditionals" and suggests job-level environment variables, so secrets are copied into `env` and steps test `env.<NAME>`.
5. **Linux tools.** The deb maker needs `dpkg` and `fakeroot` (template `README.md`).
6. **Lock file.** `bun install --frozen-lockfile` fails if `bun.lock` is missing or out of date, so commit the lock file.

### 4.2 Action versions

The table below lists the actions used and the version each was checked at. The builder's own `.github/workflows/ci.yml` still uses `actions/checkout@v4` and `actions/setup-node@v4`; both have newer major versions.

| Action | Tag used | Evidence on 2026-10-22 |
| --- | --- | --- |
| `actions/checkout` | `@v7` | README usage shows `actions/checkout@v7`; newest release `v7.0.1` |
| `actions/setup-node` | `@v7` | README usage shows `actions/setup-node@v7`; newest release `v7.1.0`; `node-version` accepts major versions such as `22` |
| `oven-sh/setup-bun` | `@v2` | README usage shows `oven-sh/setup-bun@v2`; newest release `v2.2.0`; inputs include `bun-version` |
| `apple-actions/import-codesign-certs` | `@v7` | README usage shows `@v7` with inputs `p12-file-base64` and `p12-password` |

### 4.3 Secrets to create

Create these repository secrets under the repository's settings (Secrets and variables, Actions). Only `GITHUB_TOKEN` is required; it is provided automatically. The table below lists the optional signing secrets and which step reads each.

| Secret | Read by | Purpose |
| --- | --- | --- |
| `APPLE_SIGNING_IDENTITY` | `forge.config.ts` | Turns on macOS signing and notarization; the Developer ID Application identity name |
| `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID` | `forge.config.ts` (`osxNotarize`) | Notarization with an app-specific password |
| `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD` | `import-codesign-certs` step | The Developer ID Application certificate exported as `.p12`, base64-encoded, and its password |
| `WINDOWS_CERTIFICATE`, `WINDOWS_CERTIFICATE_PASSWORD` | Windows step and `@electron/windows-sign` | A `.pfx`, base64-encoded, and its password (legacy certificates only; see `03-signing.md`) |
| `WINDOWS_SIGN_WITH_PARAMS` | `@electron/windows-sign` | SignTool arguments for a cloud signing provider |

The Windows secrets only take effect after `forge.config.ts` enables `windowsSign` from the environment, as proposed in section 4.5 of `03-signing.md`; the template does not do this yet.

### 4.4 The workflow file

Save the YAML below as `.github/workflows/release.yml` in the generated app. The macOS and Windows certificate steps are skipped when their secrets are absent, so the workflow also produces unsigned releases. The PowerShell step that decodes the Windows certificate has not been run in this repository (**UNVERIFIED**).

```yaml
# Builds installers on Windows, macOS and Linux and uploads them to a draft
# GitHub release named after the package.json version (for example v1.2.0).
name: Release

on:
  push:
    tags: ["v*"]
  workflow_dispatch:

permissions:
  contents: write

jobs:
  verify:
    strategy:
      fail-fast: true
      matrix:
        os: [windows-latest, macos-latest, ubuntu-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v7
      - uses: oven-sh/setup-bun@v2
      - uses: actions/setup-node@v7
        with:
          node-version: 22
      - run: bun install --frozen-lockfile
      - run: bun run verify

  publish:
    needs: verify
    strategy:
      fail-fast: false
      max-parallel: 1
      matrix:
        os: [windows-latest, macos-latest, ubuntu-latest]
    runs-on: ${{ matrix.os }}
    env:
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      APPLE_SIGNING_IDENTITY: ${{ secrets.APPLE_SIGNING_IDENTITY }}
      APPLE_ID: ${{ secrets.APPLE_ID }}
      APPLE_PASSWORD: ${{ secrets.APPLE_PASSWORD }}
      APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
      APPLE_CERTIFICATE: ${{ secrets.APPLE_CERTIFICATE }}
      APPLE_CERTIFICATE_PASSWORD: ${{ secrets.APPLE_CERTIFICATE_PASSWORD }}
      WINDOWS_CERTIFICATE: ${{ secrets.WINDOWS_CERTIFICATE }}
      WINDOWS_CERTIFICATE_PASSWORD: ${{ secrets.WINDOWS_CERTIFICATE_PASSWORD }}
      WINDOWS_SIGN_WITH_PARAMS: ${{ secrets.WINDOWS_SIGN_WITH_PARAMS }}
    steps:
      - uses: actions/checkout@v7
      - uses: oven-sh/setup-bun@v2
      - uses: actions/setup-node@v7
        with:
          node-version: 22

      - name: Linux packaging tools
        if: runner.os == 'Linux'
        run: |
          sudo apt-get update
          sudo apt-get install -y dpkg fakeroot

      - name: Import the macOS signing certificate
        if: runner.os == 'macOS' && env.APPLE_CERTIFICATE != ''
        uses: apple-actions/import-codesign-certs@v7
        with:
          p12-file-base64: ${{ secrets.APPLE_CERTIFICATE }}
          p12-password: ${{ secrets.APPLE_CERTIFICATE_PASSWORD }}

      - name: Write the Windows signing certificate
        if: runner.os == 'Windows' && env.WINDOWS_CERTIFICATE != ''
        shell: pwsh
        run: |
          $path = Join-Path $env:RUNNER_TEMP "certificate.pfx"
          [IO.File]::WriteAllBytes($path, [Convert]::FromBase64String($env:WINDOWS_CERTIFICATE))
          "WINDOWS_CERTIFICATE_FILE=$path" | Out-File -FilePath $env:GITHUB_ENV -Append -Encoding utf8

      - run: bun install --frozen-lockfile
      - run: bun run verify
      - name: Build and upload installers
        run: bun run publish
```

After the three publish jobs finish, open the draft release on GitHub, check that it holds the Windows `Setup.exe`, `.nupkg` and `RELEASES`, the macOS DMG and ZIP, and the Linux DEB and ZIP, and publish it. update.electronjs.org and other GitHub-based update services only see published releases.

### 4.5 Running the workflow

The commands below create and push a release tag from a terminal in the project folder (any operating system with Git). Replace `1.2.0` with the version in `package.json`. Publishing a release requires the user's approval for each release, as `AGENTS.md` states.

```bash
git tag v1.2.0
git push origin v1.2.0
```

## 5. Summary

The template publishes draft GitHub releases with `GITHUB_TOKEN`. Public apps update through update.electronjs.org; private apps update from static storage with the ZIP maker's `macUpdateManifestBaseUrl` and the Squirrel maker's `remoteReleases`, or from a self-hosted server. The workflow above builds on all three operating systems, gates on `bun run verify`, signs when the signing secrets exist, and publishes one runner at a time into a single draft release.
