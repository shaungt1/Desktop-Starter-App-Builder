# Code signing and notarization

Source pages:
- electron/electron docs folder, commit `c80c71c7c6b1` (2026-10-22): `docs/tutorial/code-signing.md`, `docs/tutorial/fuses.md`, `docs/tutorial/mac-app-store-submission-guide.md`
- electron-forge/electron-forge-docs, commit `494fe76a3943` (2026-10-21): `guides/code-signing/README.md`, `guides/code-signing/code-signing-macos.md`, `guides/code-signing/code-signing-windows.md`, `advanced/auto-update.md`
- electron/forge source, commit `16d47dc29387`: `packages/maker/squirrel/src/MakerSquirrel.ts`, `packages/maker/appx/src/Config.ts`, `packages/maker/pkg/src/MakerPKG.ts`
- Installed packages in a generated app: `@electron/packager` 20.3.0 (`dist/types.d.ts`), `@electron/osx-sign` 2.7.1 (`dist/types.d.ts`), `@electron/notarize` 3.1.2, `@electron/windows-sign` 1.2.2 (`dist/cjs/types.d.ts`, `dist/cjs/sign-with-signtool.js`), `electron-winstaller` 5.4.4 (`lib/options.d.ts`, `lib/index.js`)
- https://github.com/Apple-Actions/import-codesign-certs (fetched 2026-10-22)
- https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets (fetched 2026-10-22)
- The template's `electron/template/forge.config.ts` and `.env.example`, and `docs/RELEASE_AND_SIGNING.md` in this repository

Verified on 2026-10-22

**Code signing** attaches a cryptographic signature, made with a certificate issued to the publisher, to the app's executables and installers. It certifies who made the app and that it was not changed after signing (`code-signing.md`). This file explains why each operating system needs it, which accounts and certificates to obtain, which Forge configuration keys and environment variables drive it, and what the generated template already does. It extends `docs/RELEASE_AND_SIGNING.md`, which gives the short version.

## 1. Why signing is needed

The Electron documentation states that "both Windows and macOS prevent users from running unsigned applications"; users can still run them, but only through "multiple advanced and manual steps". The list below gives the specific reason on each operating system.

1. **macOS (Gatekeeper).** Gatekeeper is the macOS component that checks downloaded apps before they open. From macOS 10.15 (Catalina), an app must be both **signed** and **notarized** to run without the user disabling security checks (Forge's macOS guide). **Notarization** means uploading the app to Apple, whose automated systems scan it for malware and record the result. Mac App Store apps are the exception: they are signed for the store and not notarized.
2. **Windows (SmartScreen).** SmartScreen is the Windows feature that warns before running downloaded programs. The Electron documentation states that since June 2023 Microsoft requires an *extended validation* (EV) certificate, that cheaper software-based "OV" (organization validation) certificates "no longer provide benefits" because "Windows will treat your app as completely unsigned", and that Azure Artifact Signing "gets rid of SmartScreen warnings".
3. **Electron features that depend on a signature.** On macOS, `safeStorage` (encrypted storage in the Keychain), `app.setLoginItemSettings()`, the `EnableCookieEncryption` fuse (which the template turns on) and `autoUpdater` (Squirrel.Mac refuses unsigned updates) only behave correctly in a signed app (`code-signing.md`). Fuses are also protected by the signature: once signed, the operating system detects any change to them (`fuses.md`).
4. **Linux.** Neither the Electron nor the Forge code-signing guides describe signing Linux packages; the existing `docs/RELEASE_AND_SIGNING.md` states that Linux packages are not code-signed. Store-specific requirements for Snap are in `05-app-stores.md`.

## 2. What the template configures today

The generated `forge.config.ts` turns on macOS signing and notarization only when the environment variable `APPLE_SIGNING_IDENTITY` is set, and configures no Windows signing. The excerpt below shows the exact code.

```ts
...(process.env.APPLE_SIGNING_IDENTITY
  ? {
      osxSign: { identity: process.env.APPLE_SIGNING_IDENTITY },
      osxNotarize: {
        appleId: process.env.APPLE_ID ?? "",
        appleIdPassword: process.env.APPLE_PASSWORD ?? "",
        teamId: process.env.APPLE_TEAM_ID ?? "",
      },
    }
  : {}),
```

These keys sit inside `packagerConfig`, because macOS apps are signed and notarized at Forge's **Package** step by `@electron/packager`. `.env.example` lists `APPLE_SIGNING_IDENTITY`, `APPLE_ID`, `APPLE_PASSWORD` and `APPLE_TEAM_ID`. Windows signing is left to the user because the values depend on the certificate; section 4.5 gives a proposed configuration.

## 3. macOS

### 3.1 Account and certificates

Signing certificates for macOS are issued only by Apple, through a paid **Apple Developer Program** membership; Xcode (Apple's development environment, macOS only) is required for notarization and is the recommended way to install certificates (Forge's macOS guide). The list below gives the certificate types named in the Electron and Forge documentation and when each is used.

- **Developer ID Application**: signs apps distributed *outside* the Mac App Store. This is the certificate the template's `APPLE_SIGNING_IDENTITY` should name.
- **Developer ID Installer**: signs `.pkg` installers distributed outside the store. (The Forge guide's wording ties it to the Mac App Store; the Electron Mac App Store guide says installer certificates sign `.pkg` files and that "Mac Installer Distribution" is the store's installer certificate.)
- **Apple Development** and **Apple Distribution**: used for Mac App Store builds only (`05-app-stores.md`).

After installing a certificate, list the signing identities on the Mac with the command below (macOS). The quoted name in the output, such as `Developer ID Application: Example Ltd (TEAMID1234)`, is the value for `APPLE_SIGNING_IDENTITY`.

```bash
security find-identity -p codesigning -v
```

### 3.2 `osxSign` keys

`packagerConfig.osxSign` must exist (even as `{}`) for signing to happen; Forge passes it to `@electron/osx-sign`, whose defaults usually work. `@electron/packager` 20.3.0 types `osxSign` as `true` or an options object without `app`, `binaries`, `platform` and `version`. The keys in `@electron/osx-sign` 2.7.1 are listed below.

- `identity`: the certificate name (the template sets this).
- `keychain`: keychain to search for the identity.
- `optionsForFile(filePath)`: returns per-file options such as `entitlements` (a `.plist` file of capabilities), `hardenedRuntime`, `requirements`, `signatureFlags`, `timestamp`, `additionalArguments`.
- `identityValidation`, `ignore`, `preAutoEntitlements` (default `true`), `preEmbedProvisioningProfile` (default `true`), `provisioningProfile`, `strictVerify` (default `true`), `type` (`"distribution"` by default, for Mac App Store builds), `batchCodesignCalls`.

Entitlements are privileges stored in the signature, such as camera or microphone access. `@electron/osx-sign` ships a default set that works for both store and direct distribution; to customize, return an `entitlements` path from `optionsForFile`.

### 3.3 `osxNotarize` keys and environment variables

`packagerConfig.osxNotarize` is passed to `@electron/notarize`, which runs Apple's `notarytool`; it requires `osxSign` to be set and only runs on a macOS host with Xcode. Forge documents three ways to authenticate, shown in the table below with the environment variable names the Forge guide uses.

| Method | `osxNotarize` keys | Environment variables in the Forge guide |
| --- | --- | --- |
| App-specific password | `appleId`, `appleIdPassword`, `teamId` | `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID` |
| App Store Connect API key | `appleApiKey` (path to the `AuthKey_XXXXXXXXXX.p8` file), `appleApiKeyId` (the 10-character ID), `appleApiIssuer` (issuer UUID) | `APPLE_API_KEY`, `APPLE_API_KEY_ID`, `APPLE_API_ISSUER` |
| Keychain profile | `keychainProfile`, optional `keychain` | none (created once with `notarytool store-credentials`) |

The template uses the first method. `APPLE_PASSWORD` is an **app-specific password** generated in the Apple account, not the Apple account's password, and must be regenerated if the account password changes. The API key file can be downloaded only once. To use the API-key method instead, replace the template's `osxNotarize` object with the keys in the second row and set those variables. Credentials must never be written into the configuration file itself.

### 3.4 Signing on GitHub Actions

`@electron/osx-sign` finds the identity in a keychain, so a CI runner must import the certificate first (`docs/RELEASE_AND_SIGNING.md` notes the certificate "must be in the keychain"). The `apple-actions/import-codesign-certs` action does this; its README shows tag `@v7` with the inputs `p12-file-base64` (the exported `.p12` certificate, base64-encoded) and `p12-password`. GitHub's documentation states that secrets "cannot be directly referenced in `if:` conditionals" and suggests job-level environment variables instead, which is why the workflow in `04-publishing-and-updates.md` copies secrets into `env` and tests `env.APPLE_SIGNING_IDENTITY`. The secret names used there are `APPLE_CERTIFICATE` and `APPLE_CERTIFICATE_PASSWORD` (matching the Tauri base), plus the four variables above.

## 4. Windows

### 4.1 Tools and where signing happens

Windows signing uses Microsoft's **SignTool** (`signtool.exe`). Forge's guide says to install Visual Studio (the free Community edition is enough) to obtain it; `@electron/windows-sign` 1.2.2 also ships its own copy at `vendor/signtool.exe` and uses it when no other path is given. Every Electron packaging tool signs through `@electron/windows-sign` and exposes its options as a `windowsSign` property (`code-signing.md`).

Forge's guide states that on Windows, apps are signed "on the installer level at the **Make** step", through the Squirrel or WiX maker's configuration. `@electron/packager` additionally accepts `packagerConfig.windowsSign`, which signs the app's own `.exe` and `.dll` files at the **Package** step; the Forge Azure example sets both.

### 4.2 Certificate types

The list below summarizes the certificate options described in the Electron and Forge documentation.

1. **EV certificate on a hardware token.** Since June 2023, code-signing private keys must be stored on hardware meeting FIPS 140 Level 2, Common Criteria EAL 4+ or equivalent, typically a USB token. Such a certificate "cannot be simply downloaded onto a CI infrastructure".
2. **Cloud signing from a certificate authority.** The signing hardware stays in the provider's data centre and a command-line tool signs remotely; Electron's own apps use DigiCert KeyLocker. Any provider with a command-line signing tool works through `signWithParams` or `signToolPath`.
3. **Azure Artifact Signing** (formerly Azure Trusted Signing): Microsoft's cloud signing service, described as the cheapest Windows option. The Electron docs say it is limited to developers in certain countries; the Forge guide (October 2025 wording) says US and Canada-based organizations with three or more years of verifiable history, and individual developers in the US and Canada.
4. **Legacy `.pfx` file** (Personal Information Exchange). Forge's examples still accept `certificateFile` and `certificatePassword`, but new software-based certificates are no longer sold and, per the Electron docs, give no SmartScreen benefit.

### 4.3 `windowsSign` keys and environment variables

The table below lists the options of `@electron/windows-sign` 1.2.2 and the environment variable each falls back to when the option is not given (from `sign-with-signtool.js`).

| Option | Environment fallback | Meaning |
| --- | --- | --- |
| `certificateFile` | `WINDOWS_CERTIFICATE_FILE` | Path to a `.pfx` certificate. |
| `certificatePassword` | `WINDOWS_CERTIFICATE_PASSWORD` | Its password (or use `signWithParams`). |
| `signWithParams` | `WINDOWS_SIGN_WITH_PARAMS` | Extra SignTool arguments, string or array (used for cloud signing). |
| `timestampServer` | `WINDOWS_TIMESTAMP_SERVER` | Timestamp server; default `http://timestamp.digicert.com`. |
| `signToolPath` | `WINDOWS_SIGNTOOL_PATH` | Path to `signtool.exe` or a replacement tool; default the bundled copy. |
| `description`, `website` | `WINDOWS_SIGN_DESCRIPTION`, `WINDOWS_SIGN_WEBSITE` | Passed to SignTool as `/d` and `/du`. |
| `hookModulePath` | `WINDOWS_SIGN_HOOK_MODULE_PATH` | A module whose function signs each file instead of SignTool. |
| `debug`, `automaticallySelectCertificate` (default `true`), `signJavaScript`, `hashes`, `hookFunction` | none | Logging, SignTool `/a`, signing `.js` files, hash algorithms, an in-process signing function. |

The Squirrel maker (through `electron-winstaller` 5.4.4) signs only when one of these is configured: `certificateFile` with `certificatePassword`, `signWithParams`, or `windowsSign`. The first three are documented there as legacy parameters kept for compatibility. For the MSIX maker, the same options go under `windowsSignOptions`; for the deprecated AppX maker, use `devCert`, `certPass` and `signtoolParams` (`02-makers-and-distribution.md`).

### 4.4 Azure Artifact Signing with Forge

Forge's guide gives the following procedure, shown here in order. It requires an Azure account with Artifact Signing set up and the client tools installed on the Windows machine (the guide points to a third-party walkthrough for those steps, which was not opened for this file).

1. Install `dotenv-cli` and make sure `@electron/windows-sign` is at least 1.2.2 (the generated app already has 1.2.2):

   ```bash
   bun add -d dotenv-cli
   ```

   ```bash
   npm install --save-dev dotenv-cli
   ```

2. Create `.env.trustedsigning` in the project root with `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID`, `AZURE_METADATA_JSON` (path to `metadata.json`), `AZURE_CODE_SIGNING_DLIB` (path to `Azure.CodeSigning.Dlib.dll`) and `SIGNTOOL_PATH` (path to `signtool.exe`). None of the paths may contain spaces. Add `.env.trustedsigning` and `electron-windows-sign.log` to `.gitignore`.
3. Create `windowsSign.ts` exporting `{ signToolPath: process.env.SIGNTOOL_PATH, signWithParams: "/v /debug /dlib <AZURE_CODE_SIGNING_DLIB> /dmdf <AZURE_METADATA_JSON>", timestampServer: "http://timestamp.acs.microsoft.com", hashes: ["sha256"] }`.
4. In `forge.config.ts`, set `packagerConfig.windowsSign` and pass `windowsSign` to `new MakerSquirrel({...})` (the guide adds `// @ts-expect-error - incorrect types exported by MakerSquirrel` above it).
5. Prefix the `make` and `publish` scripts with `dotenv -e .env.trustedsigning -- `.

For signing from Linux or macOS, the Electron docs show the `jsign` tool with `--storetype TRUSTEDSIGNING` and an `AZURE_ACCESS_TOKEN`; that route is outside Forge.

### 4.5 Proposed template change (non-binding)

To let CI sign Windows builds without editing `forge.config.ts` per user, the builder could turn signing on from the environment, as it does for macOS. The sketch below relies on the environment fallbacks in section 4.3; it has **not** been built or tested in this repository.

```ts
const windowsSign =
  process.env.WINDOWS_CERTIFICATE_FILE || process.env.WINDOWS_SIGN_WITH_PARAMS ? {} : undefined;

// in packagerConfig:
...(windowsSign ? { windowsSign } : {}),

// in makers:
new MakerSquirrel({ name: "__APP_SLUG__", setupIcon: "assets/icon.ico", ...(windowsSign ? { windowsSign } : {}) }),
```

With this in place, CI sets `WINDOWS_CERTIFICATE_FILE` and `WINDOWS_CERTIFICATE_PASSWORD` (legacy `.pfx`), or `WINDOWS_SIGN_WITH_PARAMS` (and, if needed, `WINDOWS_SIGNTOOL_PATH`) for a cloud provider.

## 5. Checklist

Before a signed release, confirm the items below in order.

1. macOS: `security find-identity -p codesigning -v` lists the Developer ID Application identity, and `APPLE_SIGNING_IDENTITY`, `APPLE_ID`, `APPLE_PASSWORD` and `APPLE_TEAM_ID` are set (or the API-key variables after changing the config).
2. Windows: a signing route from section 4.2 is chosen and its configuration is present for the Squirrel maker (and `packagerConfig.windowsSign`).
3. No certificate, password or token appears in `forge.config.ts`, `app.config.json` or any committed file.
4. The user has approved signing for this release, as `AGENTS.md` requires.
