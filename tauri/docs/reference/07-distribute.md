# Distribution: Bundling, Signing, Updater, CI

Source pages:
- https://github.com/tauri-apps/tauri-docs/blob/b62e441c3522fb9ffb01a92898071bac9463d6f7/src/content/docs/distribute/index.mdx
- https://github.com/tauri-apps/tauri-docs/blob/b62e441c3522fb9ffb01a92898071bac9463d6f7/src/content/docs/distribute/windows-installer.mdx
- https://github.com/tauri-apps/tauri-docs/blob/b62e441c3522fb9ffb01a92898071bac9463d6f7/src/content/docs/distribute/dmg.mdx
- https://github.com/tauri-apps/tauri-docs/blob/b62e441c3522fb9ffb01a92898071bac9463d6f7/src/content/docs/distribute/macos-application-bundle.mdx
- https://github.com/tauri-apps/tauri-docs/blob/b62e441c3522fb9ffb01a92898071bac9463d6f7/src/content/docs/distribute/debian.mdx
- https://github.com/tauri-apps/tauri-docs/blob/b62e441c3522fb9ffb01a92898071bac9463d6f7/src/content/docs/distribute/rpm.mdx
- https://github.com/tauri-apps/tauri-docs/blob/b62e441c3522fb9ffb01a92898071bac9463d6f7/src/content/docs/distribute/appimage.mdx
- https://github.com/tauri-apps/tauri-docs/blob/b62e441c3522fb9ffb01a92898071bac9463d6f7/src/content/docs/distribute/Sign/macos.mdx
- https://github.com/tauri-apps/tauri-docs/blob/b62e441c3522fb9ffb01a92898071bac9463d6f7/src/content/docs/distribute/Sign/windows.mdx
- https://github.com/tauri-apps/tauri-docs/blob/b62e441c3522fb9ffb01a92898071bac9463d6f7/src/content/docs/distribute/Pipelines/github.mdx
- https://github.com/tauri-apps/tauri-docs/blob/b62e441c3522fb9ffb01a92898071bac9463d6f7/src/content/docs/plugin/updater.mdx
- https://github.com/tauri-apps/tauri/blob/8d3efdeea5b4221301a4fc5e2d4ab969abe8aa7f/crates/tauri-cli/CHANGELOG.md (`requireSignedVersion`)
- https://github.com/tauri-apps/plugins-workspace/blob/11211c30e71796cd737280303244552bb7f70797/plugins/updater/src/config.rs (updater config keys)
- https://v2.tauri.app/reference/cli/ (fetched; `build`, `signer generate` options)

Verified on 2026-10-21

## Building and bundling

`bun run tauri build` compiles the frontend (via `beforeBuildCommand`), compiles the Rust app in release mode, and bundles it into every format listed in `bundle.targets` (default `"all"`). The build and bundle steps can be split, which is useful when one compiled binary feeds several bundle configurations:

```sh
bun tauri build --no-bundle
bun tauri bundle --bundles app,dmg
bun tauri bundle --bundles app --config src-tauri/tauri.appstore.conf.json
```

To build just one format, use `--bundles`, for example `bun tauri build --bundles dmg`. Output goes to `src-tauri/target/release/bundle/<format>/` (or `target/<triple>/release/bundle/...` when `--target` is used).

The app version comes from `tauri.conf.json > version`, falling back to the `version` in `src-tauri/Cargo.toml`.

## Formats per operating system

The table below summarizes which formats each OS produces and the main constraints the docs state.

| OS | `targets` values | Notes from the docs |
| --- | --- | --- |
| Windows | `msi`, `nsis` | `.msi` uses WiX Toolset v3 and can **only be built on Windows**; it also needs the VBSCRIPT feature. `nsis` produces `-setup.exe` and can be cross-compiled from Linux/macOS with caveats. |
| macOS | `app`, `dmg` | `app` is the `.app` bundle; `dmg` is a disk image for distribution outside the App Store. Default minimum macOS is 10.13 (`bundle.macOS.minimumSystemVersion`). Entitlements and extra frameworks are configured under `bundle.macOS`. |
| Linux | `deb`, `rpm`, `appimage` | Build on the oldest distribution you support (glibc compatibility); Ubuntu 22.04 and Debian 12 are the suggested baselines. AppImages are larger because they bundle dependencies, and ARM AppImages cannot be cross-compiled (they must be built on ARM or under emulation). Other channels covered by the docs: Snap, Flatpak, AUR. |

### Windows: WebView2 in the installer

Windows installers by default download and run the WebView2 bootstrapper if the runtime is missing. `bundle.windows.webviewInstallMode.type` can change that:

| Mode | Needs internet at install | Extra size | Docs note |
| --- | --- | --- | --- |
| `downloadBootstrapper` | yes | 0 MB | Default; not recommended for Windows 7 `.msi` deployment |
| `embedBootstrapper` | yes | about 1.8 MB | Better Windows 7 support for `.msi` |
| `offlineInstaller` | no | about 127 MB | For offline environments |
| `fixedVersion` | no | about 180 MB | Ships a fixed WebView2 version |
| `skip` | no | 0 MB | Not recommended |

### Windows: cross-compiling NSIS from Linux or macOS

The docs describe this as a last resort. Steps: install NSIS (`sudo apt install nsis` on Ubuntu, `brew install nsis` on macOS), install LLVM and the LLD linker, `rustup target add x86_64-pc-windows-msvc`, `cargo install --locked cargo-xwin`, then:

```sh
bun tauri build --runner cargo-xwin --target x86_64-pc-windows-msvc
```

Output is in `target/x86_64-pc-windows-msvc/release/bundle/nsis/`. Signing a cross-compiled installer needs an external tool via `bundle.windows.signCommand`, because the default signing only works on Windows.

## Code signing: Windows

Signing prevents the SmartScreen "untrusted" warning and is required for the Microsoft Store; it is not required to run the app. The docs cover OV certificates obtained before 1 June 2023, Azure Key Vault (using the `relic` tool), Azure Artifact Signing, and a custom sign command. They note that since 2024 EV certificates no longer get immediate SmartScreen reputation.

For a certificate installed in the Windows certificate store, three `bundle.windows` values are needed:

```json
"windows": {
  "certificateThumbprint": "A1B1A2B2A3B3A4B4A5B5A6B6A7B7A8B8A9B9A0B0",
  "digestAlgorithm": "sha256",
  "timestampUrl": "http://timestamp.comodoca.com"
}
```

The thumbprint and digest algorithm are read from the certificate's Details tab in `certmgr.msc`; the timestamp URL comes from the certificate issuer. The guide converts `.cer` + key to `.pfx` with `openssl pkcs12 -export`, imports it with `Import-PfxCertificate`, and for GitHub Actions stores the base64 `.pfx` and its password as secrets (named `WINDOWS_CERTIFICATE` and `WINDOWS_CERTIFICATE_PASSWORD` in the example) and imports them in a workflow step before the build. Any other tool can be used through `bundle.windows.signCommand`, whose arguments must contain `%1` as the placeholder for the file path.

## Code signing and notarization: macOS

Signing avoids the "app is damaged / cannot be opened" warning for downloaded apps and is required for the App Store. It needs an Apple Developer account (the free tier cannot notarize). Use a `Developer ID Application` certificate for distribution outside the App Store and `Apple Distribution` for the App Store.

**Local signing.** Install the certificate in the login keychain, find the identity with `security find-identity -v -p codesigning`, and provide it as `bundle.macOS.signingIdentity` or the `APPLE_SIGNING_IDENTITY` environment variable.

**CI signing.** Export the certificate as `.p12`, base64 it (`openssl base64 -A -in certificate.p12 -out certificate-base64.txt`), and set:

| Variable | Value |
| --- | --- |
| `APPLE_CERTIFICATE` | base64 of the `.p12` |
| `APPLE_CERTIFICATE_PASSWORD` | the `.p12` export password |
| `APPLE_SIGNING_IDENTITY` | the signing identity name |

**Notarization** (required with a Developer ID certificate) uses one of two credential sets:

| Method | Variables |
| --- | --- |
| App Store Connect API key | `APPLE_API_ISSUER` (issuer ID), `APPLE_API_KEY` (key ID), `APPLE_API_KEY_PATH` (path to the downloaded `.p8` private key) |
| Apple ID | `APPLE_ID` (account email), `APPLE_PASSWORD` (an app-specific password), `APPLE_TEAM_ID` |

After setting them, re-run the build or bundle command. `--skip-stapling` skips stapling for a first notarization pass.

**Ad-hoc signing.** Without an Apple identity you can set `"signingIdentity": "-"`. This helps Apple Silicon machines accept the app, but users still have to allow it in Privacy & Security. The GitHub pipeline guide recommends ad-hoc signing for unsigned macOS builds published to GitHub releases.

## Updater

The updater plugin checks a URL for a newer version, downloads it, verifies its signature and installs it. Signature verification cannot be turned off.

### 1. Generate a signing key pair

```sh
bunx tauri signer generate -w ~/.tauri/myapp.key
```

(That is the docs' Bun form; `bun run tauri signer generate ...` also works in a project.) This writes the private key to the given path and the public key to `<path>.pub`. Options from the CLI reference: `-p/--password`, `-w/--write-keys`, `-f/--force`, `--ci` (no prompts). In testing, `bun run tauri signer generate --ci -w ../keys/myapp.key -p ""` produced `myapp.key` and `myapp.key.pub` without prompts **(tested)**. Losing the private key means existing installs can never receive another update.

### 2. Configure `tauri.conf.json`

```json
{
  "bundle": { "createUpdaterArtifacts": true },
  "plugins": {
    "updater": {
      "pubkey": "CONTENT OF myapp.key.pub",
      "endpoints": [
        "https://releases.myapp.com/{{target}}/{{arch}}/{{current_version}}",
        "https://github.com/user/repo/releases/latest/download/latest.json"
      ]
    }
  }
}
```

- `pubkey` must be the key **content**, not a file path.
- `endpoints` is tried in order; Tauri moves to the next only on a non-2xx status. TLS is required in production unless `dangerousInsecureTransportProtocol: true`.
- URL variables: `{{current_version}}`, `{{target}}` (`linux`, `windows`, `darwin`), `{{arch}}` (`x86_64`, `i686`, `aarch64`, `armv7`). Custom variables are not supported.
- On Windows, `plugins.updater.windows.installMode` may be `passive` (default, progress bar, no interaction), `basicUi` (needs user interaction) or `quiet` (no feedback; cannot elevate on its own).
- `requireSignedVersion`: new in the 2.12 CLI. The CLI changelog says `tauri build` now records the app version inside the updater signature, and `tauri add updater` enables `requireSignedVersion` so the updater rejects a response whose announced version does not match the signed one. It was set automatically in testing **(tested)**. The plugin config source shows it defaults to `false` when not set, and that there is also an `allowDowngrades` key (default `false`). The updater docs page at this commit does not describe either key.

### 3. Build with the private key in the environment

The private key must be in environment variables at build time; the docs state `.env` files do **not** work.

```sh
export TAURI_SIGNING_PRIVATE_KEY="path or content of the private key"
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD=""   # optional
bun run tauri build
```

On Windows PowerShell use `$env:TAURI_SIGNING_PRIVATE_KEY="..."`. The CLI's own output (observed) adds that for `build`/`bundle` the key may be a path or the key string, while `signer sign` needs the literal key string or `TAURI_SIGNING_PRIVATE_KEY_PATH`.

With `createUpdaterArtifacts: true` the build emits signatures next to the normal bundles: on Linux `myapp.AppImage` + `myapp.AppImage.sig`; on macOS `myapp.app.tar.gz` + `myapp.app.tar.gz.sig`; on Windows `myapp-setup.exe.sig` and `myapp.msi.sig` beside the installers. (`"v1Compatible"` instead produces `.tar.gz`/`.zip` wrappers for apps migrating from v1.)

### 4. Serve update metadata

**Static JSON** (for S3, GitHub releases, gists). Required: `version`, and for each platform `platforms.<os>-<arch>.url` and `.signature`; `notes` and `pub_date` (RFC 3339) are optional. Platform keys are `linux`/`darwin`/`windows` combined with `x86_64`/`aarch64`/`i686`/`armv7`, for example `darwin-aarch64`. `signature` is the **content** of the `.sig` file, not a path or URL. Tauri validates the whole file before checking the version, so every listed platform entry must be complete. `tauri-action` generates this file for GitHub releases.

**Dynamic server.** Respond `204 No Content` when there is no update, or `200 OK` with `{ "version", "url", "signature", "notes"?, "pub_date"? }`.

### 5. Check for updates in the app

```ts
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

const update = await check();
if (update) {
  await update.downloadAndInstall((event) => {
    // event.event is 'Started' | 'Progress' | 'Finished'
  });
  await relaunch();
}
```

The Rust equivalent uses `tauri_plugin_updater::UpdaterExt` and `app.updater()?.check().await?`, then `update.download_and_install(on_chunk, on_finish).await?` and `app.restart()`. The manual setup registers the plugin inside `setup` with `#[cfg(desktop)] app.handle().plugin(tauri_plugin_updater::Builder::new().build());`, while `tauri add` inserts `.plugin(tauri_plugin_updater::Builder::new().build())` on the builder; both appear in the sources.

## GitHub Actions with `tauri-action`

`tauri-apps/tauri-action` runs `tauri build` on GitHub runners, uploads the bundles to a GitHub release, and can produce the updater JSON. The docs' example workflow, abbreviated and annotated:

```yaml
name: 'publish'
on:
  workflow_dispatch:
  push:
    branches: [release]
jobs:
  publish-tauri:
    permissions:
      contents: write                 # needed to create the release
    strategy:
      fail-fast: false
      matrix:
        include:
          - platform: 'macos-latest'
            args: '--target aarch64-apple-darwin'
          - platform: 'macos-latest'
            args: '--target x86_64-apple-darwin'
          - platform: 'ubuntu-22.04'
            args: ''
          - platform: 'ubuntu-22.04-arm'   # public repos only
            args: ''
          - platform: 'windows-latest'
            args: ''
    runs-on: ${{ matrix.platform }}
    steps:
      - uses: actions/checkout@v7
      - name: install dependencies (ubuntu only)
        if: matrix.platform == 'ubuntu-22.04' || matrix.platform == 'ubuntu-22.04-arm'
        run: |
          sudo apt-get update
          sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf xdg-utils
      - uses: actions/setup-node@v6
        with: { node-version: lts/*, cache: 'npm' }
      - uses: dtolnay/rust-toolchain@stable
        with:
          targets: ${{ matrix.platform == 'macos-latest' && 'aarch64-apple-darwin,x86_64-apple-darwin' || '' }}
      - uses: swatinem/rust-cache@v2
        with: { workspaces: './src-tauri -> target' }
      - run: npm install
      - uses: tauri-apps/tauri-action@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tagName: app-v__VERSION__        # __VERSION__ is replaced with the app version
          releaseName: 'App v__VERSION__'
          releaseBody: 'See the assets to download this version and install.'
          releaseDraft: true
          prerelease: false
          args: ${{ matrix.args }}
```

Notes from the guide: use the `projectPath` input when the app is not at the repository root; the workflow can instead trigger on tags such as `app-v*`; `GITHUB_TOKEN` is read-only by default, which is why `contents: write` is set. The docs' example uses npm; the Bun adaptation (for example `oven-sh/setup-bun` and `bun install`) is not in the Tauri docs and is **UNVERIFIED**. For signed builds, add the Windows or macOS signing variables above (and `TAURI_SIGNING_PRIVATE_KEY` / `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` for updater signatures) to the `env` of the `tauri-action` step; passing the updater key variables to `tauri-action` this way is implied by "the key must be in the environment at build time" but the exact workflow snippet is not on the pages read, so treat it as **UNVERIFIED**.

The full list of `tauri-action` inputs lives in the action's README, which was not opened in this session.
