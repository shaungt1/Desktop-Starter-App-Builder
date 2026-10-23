# Code Signing for Every Platform

Source pages:
- tauri-apps/tauri-docs @ `11934e365dfea50ef116f51cb7e26742554a34c6` (committed 2026-10-22), files:
  - `src/content/docs/distribute/Sign/windows.mdx` (https://v2.tauri.app/distribute/sign/windows/)
  - `src/content/docs/distribute/Sign/macos.mdx` (https://v2.tauri.app/distribute/sign/macos/)
  - `src/content/docs/distribute/Sign/linux.mdx` (https://v2.tauri.app/distribute/sign/linux/)
  - `src/content/docs/distribute/Sign/android.mdx` (https://v2.tauri.app/distribute/sign/android/)
  - `src/content/docs/distribute/Sign/ios.mdx` (https://v2.tauri.app/distribute/sign/ios/)
  - `src/content/docs/distribute/rpm.mdx` (RPM signing section; https://v2.tauri.app/distribute/rpm/)
  - `src/content/docs/distribute/app-store.mdx` (App Store Connect API key section; https://v2.tauri.app/distribute/app-store/)
  - `src/content/docs/plugin/updater.mdx` (updater signing keys; https://v2.tauri.app/plugin/updater/)
  - `src/content/docs/reference/environment-variables.mdx` (https://v2.tauri.app/reference/environment-variables/)
- `@tauri-apps/cli` 2.12.4 `config.schema.json` (from the local Bun package cache), for the exact `bundle.windows`, `bundle.macOS` and `bundle.iOS` keys and their defaults
- tauri-apps/tauri-action @ `a6e90ddc4ba4721f294e52b856d3d50e645edc07`, file `examples/publish-to-auto-release-universal-macos-app-with-signing-certificate.yml`

Verified on 2026-10-22

## What this page covers and how it relates to the others

Code signing is the act of attaching a cryptographic signature to a program or installer. The signature is made with a private key that only the publisher holds, and it is checked against a certificate (a public document that ties the matching public key to a verified identity). When the operating system or store can verify the signature, it knows who published the file and that nobody changed it afterwards. When it cannot, it warns the person installing the app or refuses to run it.

This page explains, for each platform Tauri 2 supports, why signing is needed, what you must buy or register, the exact steps, and which secret goes where. It extends two existing documents rather than repeating them: `07-distribute.md` in this folder already summarizes Windows and macOS signing and the updater, and `docs/RELEASE_AND_SIGNING.md` in the builder explains how the builder hands signing over to the app owner. The GitHub Actions workflows that consume the secrets listed here are in `12-pipelines-ci.md`, and the stores that require signing are in `13-distribution-stores.md`.

Two terms recur throughout. **CI** (continuous integration) is a service, such as GitHub Actions, that builds the app on hosted machines called **runners**. A **CI secret** is an encrypted value stored in the repository settings and exposed to a workflow as an environment variable; secrets are how certificates and passwords reach a runner without being committed to the repository.

## Summary table

The table below lists, for each platform, what you need to obtain, where Tauri reads it, and the secret names the official examples use in CI. The secret names in the last column are the names used in the Tauri docs' examples; GitHub lets you choose any names, but the environment variable names that Tauri itself reads (written in `UPPER_CASE` in the "Configured in" column) are fixed.

| Platform | What you need | Configured in | CI secret names used in the docs |
| --- | --- | --- | --- |
| Windows (certificate in the Windows certificate store) | A code signing certificate (OV, organization validated) and its private key, converted to `.pfx` | `bundle.windows.certificateThumbprint`, `bundle.windows.digestAlgorithm`, `bundle.windows.timestampUrl` (optional `bundle.windows.tsp`) in `tauri.conf.json` | `WINDOWS_CERTIFICATE`, `WINDOWS_CERTIFICATE_PASSWORD` (imported by a workflow step, not read by Tauri) |
| Windows (Azure Key Vault) | Azure Key Vault with a certificate, an app registration, and the `relic` tool | `bundle.windows.signCommand`, plus `src-tauri/relic.conf`; environment `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_CLIENT_SECRET` | `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_CLIENT_SECRET` |
| Windows (Azure Artifact Signing) | An Artifact Signing account and certificate profile, an app registration, and `artifact-signing-cli` | `bundle.windows.signCommand`; environment `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID` | Same three names |
| macOS | Apple Developer account (paid, for notarization) and a `Developer ID Application` certificate (outside the App Store) or `Apple Distribution` certificate (App Store) | `bundle.macOS.signingIdentity` or `APPLE_SIGNING_IDENTITY`; CI: `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`; notarization: `APPLE_API_ISSUER`, `APPLE_API_KEY`, `APPLE_API_KEY_PATH` or `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID` | `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `KEYCHAIN_PASSWORD`, `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID` |
| Linux AppImage | A GPG key pair | Environment `SIGN`, `SIGN_KEY`, `APPIMAGETOOL_SIGN_PASSPHRASE`, `APPIMAGETOOL_FORCE_SIGN` | No names given in the docs |
| Linux RPM | A GPG key pair, exported in ASCII-armored form | Environment `TAURI_SIGNING_RPM_KEY`, `TAURI_SIGNING_RPM_KEY_PASSPHRASE` | No names given in the docs |
| Android | A Java keystore (`.jks`) holding an upload key | `src-tauri/gen/android/keystore.properties` and `src-tauri/gen/android/app/build.gradle.kts` | `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`, `ANDROID_KEY_BASE64` |
| iOS | Apple Developer program membership; automatic signing (Xcode or an App Store Connect API key) or manual signing (certificate and provisioning profile) | Automatic: `APPLE_API_ISSUER`, `APPLE_API_KEY`, `APPLE_API_KEY_PATH`, plus `bundle.iOS.developmentTeam` or `APPLE_DEVELOPMENT_TEAM`. Manual: `IOS_CERTIFICATE`, `IOS_CERTIFICATE_PASSWORD`, `IOS_MOBILE_PROVISION` | The same names as the environment variables |
| Updater (all desktop platforms) | A key pair from `tauri signer generate` | `plugins.updater.pubkey` (public key content) in `tauri.conf.json`; environment `TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | `TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` (names from the CrabNebula workflow in `12-pipelines-ci.md`) |

As the table shows, the desktop operating systems sign installers with certificates issued by an outside authority, the mobile platforms sign with keys tied to a developer account, and the updater uses its own independent key pair that has nothing to do with operating system trust.

## Windows

### Why it is needed

The Windows signing page states that code signing is required to list the app in the Microsoft Store and to prevent a **SmartScreen** warning when the installer is downloaded through a browser. SmartScreen is the Windows component that checks downloaded programs against a reputation service and warns that an unrecognized app "is not trusted and can not be started". Signing is not required to run the app: a user who ignores the warning, or who did not download through a browser, can still install it.

The page also says that since 2024 an **EV** (Extended Validation) certificate no longer gives an app immediate SmartScreen reputation. EV and **OV** (Organization Validated) certificates now build reputation the same way, so a newly signed release can show a warning with either kind until the file and certificate have built reputation. Signing every release with the same certificate lets that reputation carry over. An OV certificate is described as generally cheaper and available to individuals. The page adds that you may submit the app to Microsoft for manual review, which may (without guarantee) grant reputation to that specific file.

### What you must obtain

You need a **code signing** certificate (the page stresses that SSL certificates do not work), bought from a certificate authority such as those listed in Microsoft's documentation. The OV walkthrough below applies only to OV certificates acquired **before 1 June 2023**; for EV certificates and for OV certificates received after that date, the docs say to follow your certificate issuer's documentation and then use a custom sign command. The docs do not state prices.

### Method 1: certificate in the Windows certificate store (OV before June 2023)

This method imports the certificate into the current user's certificate store and lets Tauri call Microsoft's `signtool.exe` with the certificate's thumbprint (a SHA-1 hash that identifies one certificate). The steps are as follows.

1. Convert the certificate (`cert.cer`) and private key (`private-key.key`) into one `.pfx` file (a password-protected archive holding both). You are prompted for an export password; keep it.

   ```sh
   # Windows command prompt or PowerShell, in the folder that holds the files
   openssl pkcs12 -export -in cert.cer -inkey private-key.key -out certificate.pfx
   ```

2. Import the `.pfx` into the certificate store.

   ```powershell
   # Windows PowerShell
   $WINDOWS_PFX_PASSWORD = 'MYPASSWORD'
   Import-PfxCertificate -FilePath certificate.pfx -CertStoreLocation Cert:\CurrentUser\My -Password (ConvertTo-SecureString -String $WINDOWS_PFX_PASSWORD -Force -AsPlainText)
   ```

3. Open `certmgr.msc` (Start, then type it), go to Personal, Certificates, double-click the imported certificate and open the Details tab. The "Signature hash algorithm" is the `digestAlgorithm` (likely `sha256`), and the "Thumbprint" is the `certificateThumbprint`. The timestamp URL comes from your certificate issuer; a timestamp server records when the file was signed so the signature stays valid after the certificate expires.

4. Put the three values under `bundle > windows` in `src-tauri/tauri.conf.json` and run the build.

   ```json
   {
     "bundle": {
       "windows": {
         "certificateThumbprint": "A1B1A2B2A3B3A4B4A5B5A6B6A7B7A8B8A9B9A0B0",
         "digestAlgorithm": "sha256",
         "timestampUrl": "http://timestamp.comodoca.com"
       }
     }
   }
   ```

   The docs' sample was written with an old `tauri > bundle > windows` path; in Tauri 2 the object is `bundle.windows` at the top level of the config, which is what the 2.12.4 schema defines. A successful build prints `info: signing app` followed by `Successfully signed: ...`.

The 2.12.4 config schema defines these related keys, which the list below describes so they can be used without guessing:

- `bundle.windows.certificateThumbprint`: the SHA-1 hash of the signing certificate.
- `bundle.windows.digestAlgorithm`: the file digest algorithm; the schema says it is required for code signing and SHA-256 is recommended.
- `bundle.windows.timestampUrl`: the timestamp server.
- `bundle.windows.tsp` (default `false`): set to `true` if the provider's timestamp server uses the Time-Stamp Protocol (RFC 3161); the schema names SSL.com as an example.
- `bundle.windows.signCommand`: a custom signing command (see below).

The environment variable reference also lists `TAURI_WINDOWS_SIGNTOOL_PATH`, which points Tauri at a specific `signtool.exe`.

**In GitHub Actions.** The docs store two secrets and import the certificate in a workflow step that runs before the build. The table below lists them.

| Secret | Value |
| --- | --- |
| `WINDOWS_CERTIFICATE` | Base64 text of the `.pfx` (base64 is a way of writing binary data as plain text), made with `certutil -encode certificate.pfx base64cert.txt` |
| `WINDOWS_CERTIFICATE_PASSWORD` | The `.pfx` export password |

The import step from the docs is shown below; it decodes the secret back into a `.pfx` and imports it into the runner's certificate store, after which the thumbprint in `tauri.conf.json` finds it.

```yaml
- name: import windows certificate
  if: matrix.platform == 'windows-latest'
  env:
    WINDOWS_CERTIFICATE: ${{ secrets.WINDOWS_CERTIFICATE }}
    WINDOWS_CERTIFICATE_PASSWORD: ${{ secrets.WINDOWS_CERTIFICATE_PASSWORD }}
  run: |
    New-Item -ItemType directory -Path certificate
    Set-Content -Path certificate/tempCert.txt -Value $env:WINDOWS_CERTIFICATE
    certutil -decode certificate/tempCert.txt certificate/certificate.pfx
    Remove-Item -path certificate -include tempCert.txt
    Import-PfxCertificate -FilePath certificate/certificate.pfx -CertStoreLocation Cert:\CurrentUser\My -Password (ConvertTo-SecureString -String $env:WINDOWS_CERTIFICATE_PASSWORD -Force -AsPlainText)
```

The surrounding workflow on that docs page uses outdated actions (`actions/checkout@v2`, `actions-rs/toolchain@v1`, `tauri-action@v0`, `webkit2gtk-4.0`); use only the step above and take the rest of the workflow from `12-pipelines-ci.md`.

### Method 2: Azure Key Vault with `relic`

Azure Key Vault is Microsoft's cloud service for storing keys and certificates. The docs use `relic`, an open-source signing tool that can authenticate to Azure with a client secret. Install it from its releases page or with Go:

```sh
go install github.com/sassoftware/relic/v8@latest
```

The steps from the docs are listed below.

1. In the Azure Portal, open the Key vaults service, create a key vault and note its name.
2. In the vault, open Objects, Certificates, click Generate/Import, create the certificate and note its name.
3. Create `src-tauri/relic.conf`, replacing the two placeholders:

   ```yaml
   tokens:
     azure:
       type: azure

   keys:
     azure:
       token: azure
       id: https://<KEY_VAULT_NAME>.vault.azure.net/certificates/<CERTIFICATE_NAME>
   ```

4. Point Tauri at relic:

   ```json
   {
     "bundle": {
       "windows": {
         "signCommand": "relic sign --file %1 --key azure --config relic.conf"
       }
     }
   }
   ```

5. In Microsoft Entra ID, open Manage, App registrations, and create a new registration. Set its "Application (client) ID" as `AZURE_CLIENT_ID` and its "Directory (tenant) ID" as `AZURE_TENANT_ID`. Under Certificates & secrets, create a client secret and set its Value as `AZURE_CLIENT_SECRET`.
6. In the key vault's Access control (IAM) page, assign the "Key Vault Certificate User" and "Key Vault Crypto User" roles to the app registration.

With the three variables set, `tauri build` produces signed installers.

### Method 3: Azure Artifact Signing

Azure Artifact Signing is Microsoft's managed signing service, previously called Azure Code Signing and Azure Trusted Signing. The docs list these prerequisites: an Artifact Signing account with permissions configured, .NET (8 recommended), the Azure CLI, and `signtool` (Windows 11 SDK 10.0.26100.0 or later recommended), and say that GitHub's runners already have everything installed. The steps are listed below.

1. Install the signing CLI:

   ```sh
   cargo install artifact-signing-cli
   ```

2. Set `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` and `AZURE_TENANT_ID` from your app registration (and add them as GitHub secrets).
3. Set the sign command, replacing the endpoint, account, profile and description with your own:

   ```json
   {
     "bundle": {
       "windows": {
         "signCommand": "artifact-signing-cli -e https://wus2.codesigning.azure.net -a MyAccount -c MyProfile -d MyApp %1"
       }
     }
   }
   ```

   The flags mean: `-e` the account endpoint, `-a` the account name, `-c` the certificate profile name, and `-d` an optional description. The docs warn that when signing an `.msi`, the description appears as the installer name in the UAC (User Account Control) prompt, or as a random string if unset.

### Custom sign command

`bundle.windows.signCommand` makes Tauri run any command instead of `signtool.exe`. The 2.12.4 schema accepts two forms: a string, which Tauri splits on spaces (so it cannot contain paths with spaces), or an object `{ "cmd": "...", "args": ["...", "%1"] }`. In both forms `%1` is replaced with the path of the file to sign. The docs state that when cross-compiling Windows installers from Linux or macOS you **must** use a custom sign command, because the default implementation only works on Windows.

## macOS

### Why it is needed

The macOS page states that code signing is required to list the app in the Apple App Store and to prevent a warning that the app "is broken and can not be started" when it is downloaded through a browser. That warning comes from **Gatekeeper**, the macOS component that checks downloaded apps. **Notarization** is a separate step in which Apple scans the signed app and records approval; the docs state that notarization is required when using a `Developer ID Application` certificate.

### What you must obtain

You need an Apple Developer account, which the docs describe as either paid (99 US dollars per year) or free (only for testing and development). With a free account you cannot notarize, and the app will still show as not verified. You also need an Apple computer to perform the signing, which the docs say is required by the signing process and Apple's terms.

### Create and install the certificate

The steps are listed below.

1. On the Mac, create a Certificate Signing Request (CSR) file, as described in Apple's "Create a certificate signing request" help page.
2. In the Apple Developer account, open Certificates, IDs & Profiles and click "Create a certificate". Choose `Developer ID Application` to ship outside the App Store, or `Apple Distribution` to submit to the App Store. Upload the CSR. Only the account's `Account Holder` can create `Developer ID Application` certificates.
3. Download the certificate (`.cer`) and open it to install it in the keychain (the macOS credential store). If it does not land in the right place, make sure "login" is the default keychain in Keychain Access.

### Sign locally

The certificate's keychain entry name is the **signing identity**. List valid identities with:

```sh
# macOS
security find-identity -v -p codesigning
```

Provide the identity either in `bundle.macOS.signingIdentity` in `tauri.conf.json` or in the `APPLE_SIGNING_IDENTITY` environment variable. The environment variable reference says `APPLE_SIGNING_IDENTITY` overrides the config value, and that if neither is set the identity is inferred from `APPLE_CERTIFICATE` when that is provided. A certificate that is not associated with your Apple ID does not appear in the `security` output or in Keychain Access, My Certificates.

### Sign in CI

To sign on a runner, export the certificate and give it to Tauri as base64. The steps are listed below.

1. In Keychain Access, open the login keychain's My Certificates tab, expand the certificate, right-click the key item and choose `Export "<key name>"`. Save the `.p12` file and set an export password.
2. Convert it to base64:

   ```sh
   # macOS
   openssl base64 -A -in /path/to/certificate.p12 -out certificate-base64.txt
   ```

3. Set the contents of `certificate-base64.txt` as `APPLE_CERTIFICATE` and the export password as `APPLE_CERTIFICATE_PASSWORD`.

The docs' GitHub example (and the `tauri-action` example `publish-to-auto-release-universal-macos-app-with-signing-certificate.yml`) additionally creates a temporary keychain on the runner, imports the certificate, and extracts the identity into `APPLE_SIGNING_IDENTITY`. The step from the `tauri-action` example is shown below; it uses the secrets `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD` and `KEYCHAIN_PASSWORD` (any strong password you choose for the temporary keychain).

```yaml
- name: import Apple Developer Certificate
  env:
    APPLE_CERTIFICATE: ${{ secrets.APPLE_CERTIFICATE }}
    APPLE_CERTIFICATE_PASSWORD: ${{ secrets.APPLE_CERTIFICATE_PASSWORD }}
    KEYCHAIN_PASSWORD: ${{ secrets.KEYCHAIN_PASSWORD }}
  run: |
    echo $APPLE_CERTIFICATE | base64 --decode > certificate.p12
    security create-keychain -p "$KEYCHAIN_PASSWORD" build.keychain
    security default-keychain -s build.keychain
    security unlock-keychain -p "$KEYCHAIN_PASSWORD" build.keychain
    security set-keychain-settings -t 3600 -u build.keychain
    security import certificate.p12 -k build.keychain -P "$APPLE_CERTIFICATE_PASSWORD" -T /usr/bin/codesign
    security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "$KEYCHAIN_PASSWORD" build.keychain
    security find-identity -v -p codesigning build.keychain

- name: verify certificate
  run: |
    CERT_INFO=$(security find-identity -v -p codesigning build.keychain | grep "Developer ID Application")
    CERT_ID=$(echo "$CERT_INFO" | awk -F'"' '{print $2}')
    echo "CERT_ID=$CERT_ID" >> $GITHUB_ENV
    echo "Certificate imported."
```

The build step then receives `APPLE_SIGNING_IDENTITY: ${{ env.CERT_ID }}` together with the certificate and notarization variables. Three details in the sources need care, as the list below explains.

- The Tauri docs' version of this step greps for `"Apple Development"`, while the `tauri-action` example greps for `"Developer ID Application"`. The string must match the certificate type you actually exported; for distribution outside the App Store that is `Developer ID Application`.
- The Tauri docs' example job declares `needs: prepare` but defines no `prepare` job, so copying it unchanged produces an invalid workflow.
- The Tauri docs' list of required secrets omits `APPLE_TEAM_ID`, but both the notarization section and the environment variable reference require it whenever `APPLE_ID` is used, and the `tauri-action` example passes it.

### Notarize

Tauri notarizes automatically during `tauri build` or `tauri bundle` when credentials are present. There are two credential sets, described below; set one of them.

**App Store Connect API key (recommended for CI).** An API key is a credential for Apple's App Store Connect service that does not depend on a person's password. The steps are listed below.

1. Open App Store Connect, Users and Access, the Integrations tab, click Add, enter a name and choose Developer access.
2. Set `APPLE_API_ISSUER` to the Issuer ID shown above the keys table.
3. Set `APPLE_API_KEY` to the value in the Key ID column.
4. Download the private key (a `.p8` file). It can be downloaded only once, and the button appears only after a page reload.
5. Set `APPLE_API_KEY_PATH` to the file path of the downloaded key.

The environment variable reference adds that if `APPLE_API_KEY_PATH` is not set, the macOS bundler searches `./private_keys`, `~/private_keys`, `~/.private_keys` and `~/.appstoreconnect/private_keys` for a file named `AuthKey_<api_key>.p8`, and that `API_PRIVATE_KEYS_DIR` can name the directory instead.

**Apple ID.** The steps are listed below.

1. Set `APPLE_ID` to your Apple account email.
2. Set `APPLE_PASSWORD` to an app-specific password (a separate password generated in the Apple account settings for one tool). The environment variable reference says it can also be given as `@keychain:<item>` or `@env:<VAR>`.
3. Set `APPLE_TEAM_ID` to your Team ID from the membership page of your developer account.

If the Apple ID belongs to several teams, the reference says to set `APPLE_PROVIDER_SHORT_NAME` (or `bundle.macOS.providerShortName`).

After setting the variables, rerun the build. To skip stapling (attaching the notarization ticket to the file) on a first notarization pass, append `--skip-stapling`:

```sh
# macOS
bun run tauri build --bundles dmg --skip-stapling
npm run tauri build -- --bundles dmg --skip-stapling
```

The 2.12.4 schema also defines `bundle.macOS.hardenedRuntime` (default `true`), which enables the hardened runtime security option during signing, and `bundle.macOS.entitlements`, the path to an entitlements file applied at signing time (see `13-distribution-stores.md`).

### Ad-hoc signing

Without an Apple identity you can still sign with the pseudo-identity `-`. The docs say this is useful on Apple Silicon machines, where code signing is required for all apps from the internet, but warn that it does not stop macOS from making users allow the app in Privacy & Security settings. The GitHub pipeline page recommends ad-hoc signing for unsigned macOS builds published to GitHub releases, so that Apple Silicon does not treat them as damaged.

```json
{
  "bundle": {
    "macOS": {
      "signingIdentity": "-"
    }
  }
}
```

Because `APPLE_SIGNING_IDENTITY` overrides this value, a generated app can ship with `"-"` in the config and still be properly signed in CI once the real identity is provided.

## Linux

### Why it is needed

The Linux page states that signing is not required to deploy on Linux, but increases trust: it lets users verify that the files are genuine and were not modified by an untrusted party. No account or purchase is needed; you generate your own GPG key. GPG (GNU Privacy Guard) is the standard open-source tool for creating key pairs and signatures.

### AppImage

The steps are listed below.

1. Generate a key (and back up both keys somewhere safe):

   ```sh
   # Linux
   gpg2 --full-gen-key
   ```

2. Set the environment variables below before building. The bundler embeds the signature in the AppImage.

   | Variable | Meaning |
   | --- | --- |
   | `SIGN` | Set to `1` to sign the AppImage |
   | `SIGN_KEY` | Optional GPG key ID to use |
   | `APPIMAGETOOL_SIGN_PASSPHRASE` | The key password; if unset, gpg shows a prompt, so it must be set in CI |
   | `APPIMAGETOOL_FORCE_SIGN` | Set to `1` to fail the build when signing fails (by default the AppImage is produced anyway) |

3. Show the embedded signature (replace the name and version with yours):

   ```sh
   # Linux
   ./src-tauri/target/release/bundle/appimage/$APPNAME_$VERSION_amd64.AppImage --appimage-signature
   ```

The docs warn that **AppImage does not verify the signature** itself. Users must check it manually with the `validate-$PLATFORM.AppImage` tool from the AppImageUpdate project's "continuous" release, and you must publish your key ID on an authenticated channel, such as your website served over TLS, so they can compare it:

```sh
# Linux
chmod +x validate-$PLATFORM.AppImage
./validate-$PLATFORM.AppImage $TAURI_OUTPUT.AppImage
```

A valid signature prints `Validation result: validation successful`.

### RPM

The RPM page (not the signing pages) documents RPM signing. The steps are listed below.

1. Generate a key with `gpg --gen-key`.
2. Export the private key in ASCII-armored form into `TAURI_SIGNING_RPM_KEY`, and, if the key has a passphrase, set `TAURI_SIGNING_RPM_KEY_PASSPHRASE`:

   ```sh
   # Linux
   export TAURI_SIGNING_RPM_KEY=$(cat /home/johndoe/my_super_private.key)
   export TAURI_SIGNING_RPM_KEY_PASSPHRASE=password
   ```

3. Build as usual (`bun run tauri build` / `npm run tauri build`).

The page also shows a local-only verification: export the public key (`gpg --export -a 'Tauri-App' > RPM-GPG-KEY-Tauri-App`), import it (`sudo rpm --import RPM-GPG-KEY-Tauri-App`), configure `~/.rpmmacros` as shown on that page, and run `rpm -v --checksig tauri-app-0.0.0-1.x86_64.rpm`.

### Debian packages

The Tauri docs do not describe signing `.deb` packages.

## Android

### Why it is needed

The Android page states that Android App Bundles (`.aab`) and APKs (`.apk`, the installable package format) must be signed before being uploaded for distribution, and that publishing on the Play Store requires signing with a digital certificate. Google additionally offers Play App Signing for bundles distributed through the Play Store, documented by Google. No purchase is needed for the key itself; the Google Play developer account is covered in `13-distribution-stores.md`.

### Create the keystore

A **keystore** is a password-protected Java file that holds signing keys; the **upload key** is the key inside it. Create it with `keytool`, which ships with the Java Development Kit (JDK):

```sh
# macOS / Linux
keytool -genkey -v -keystore ~/upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

```powershell
# Windows PowerShell
keytool -genkey -v -keystore $env:USERPROFILE\upload-keystore.jks -storetype JKS -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

If `keytool` is not on your `PATH`, the docs point to the copy inside Android Studio's bundled JDK: `/Applications/Android\ Studio.app/Contents/jbr/Contents/Home/bin/keytool` on macOS, `C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe` on Windows, and `/opt/android-studio/jbr/bin/keytool` on Linux (the Linux path depends on the distribution). Never commit the keystore to source control.

### Reference the keystore

Create `src-tauri/gen/android/keystore.properties` (also never committed):

```properties
password=<password defined when keytool was executed>
keyAlias=upload
storeFile=<location of the key store file, such as /Users/<user name>/upload-keystore.jks or C:\\Users\\<user name>\\upload-keystore.jks>
```

In CI the docs generate this file from three secrets. The keystore is first exported with `base64 -i /path/to/keystore.jks` and saved as `ANDROID_KEY_BASE64`.

```yaml
- name: setup Android signing
  run: |
    cd src-tauri/gen/android
    echo "keyAlias=${{ secrets.ANDROID_KEY_ALIAS }}" > keystore.properties
    echo "password=${{ secrets.ANDROID_KEY_PASSWORD }}" >> keystore.properties
    base64 -d <<< "${{ secrets.ANDROID_KEY_BASE64 }}" > $RUNNER_TEMP/keystore.jks
    echo "storeFile=$RUNNER_TEMP/keystore.jks" >> keystore.properties
```

### Configure Gradle

Gradle is the Android build system, and `build.gradle.kts` is its build script written in Kotlin. Edit `src-tauri/gen/android/app/build.gradle.kts` (the one in the `app/` folder, which contains a `buildTypes` block). The steps are listed below.

1. Add at the top of the file:

   ```kotlin
   import java.io.FileInputStream
   ```

2. Add a `release` signing configuration before the `buildTypes` block:

   ```kotlin
   signingConfigs {
       create("release") {
           val keystorePropertiesFile = rootProject.file("keystore.properties")
           val keystoreProperties = Properties()
           if (keystorePropertiesFile.exists()) {
               keystoreProperties.load(FileInputStream(keystorePropertiesFile))
           }

           keyAlias = keystoreProperties["keyAlias"] as String
           keyPassword = keystoreProperties["password"] as String
           storeFile = file(keystoreProperties["storeFile"] as String)
           storePassword = keystoreProperties["password"] as String
       }
   }
   ```

3. Use it in the release build type:

   ```kotlin
   buildTypes {
       getByName("release") {
           signingConfig = signingConfigs.getByName("release")
       }
   }
   ```

Release builds are then signed automatically. Note that this snippet casts the properties with `as String`, so a release build fails if `keystore.properties` is missing; this behaviour follows from the code shown and is not discussed on the docs page.

## iOS

### Why it is needed

The iOS page states that code signing is required to distribute through the Apple App Store (or possibly alternative marketplaces in the European Union) and, in general, to install and run the app on end-user devices.

### What you must obtain

You must enroll in the Apple Developer program, which the docs state costs 99 US dollars per year at the time of writing, and use an Apple computer. Distribution needs three linked things: the bundle identifier registered in App Store Connect, an iOS signing certificate, and a **provisioning profile** (a file issued by Apple that ties the app identifier, the certificate and the enabled iOS capabilities together). These can be managed automatically by Xcode or provided manually.

### Automatic signing

Automatic signing is the default. Xcode registers the bundle identifier, manages capability changes and picks a suitable certificate for the export method. Locally it uses the account added in Xcode, Settings, Accounts (click `+`).

In CI, create an App Store Connect API key exactly as for macOS notarization, except the iOS page says to choose **Admin** access, and set `APPLE_API_ISSUER`, `APPLE_API_KEY` and `APPLE_API_KEY_PATH`. The environment variable reference says `APPLE_API_KEY_PATH` **is required for iOS**. The development team must also be known: set `bundle.iOS.developmentTeam` in `tauri.conf.json` (the schema says it is required for iOS because signing is enforced) or the `APPLE_DEVELOPMENT_TEAM` environment variable, which overrides it.

### Manual signing

Manual signing supplies the certificate and profile through three environment variables, listed below.

| Variable | Value |
| --- | --- |
| `IOS_CERTIFICATE` | Base64 of the certificate `.p12` exported from Keychain Access |
| `IOS_CERTIFICATE_PASSWORD` | The `.p12` export password |
| `IOS_MOBILE_PROVISION` | Base64 of the provisioning profile |

The steps to produce them are listed below.

1. On the Certificates page of the developer account, create an Apple Distribution certificate, download it and install it in the keychain.
2. In Keychain Access, expand the certificate, right-click the key and export it as `.p12`, then convert it:

   ```sh
   # macOS
   base64 -i <path-to-certificate.p12> | pbcopy
   ```

   Use the clipboard contents as `IOS_CERTIFICATE`.
3. On the Identifiers page, create an App ID whose Bundle ID matches `identifier` in `tauri.conf.json`.
4. On the Profiles page, create a provisioning profile (an "App Store Connect" profile for App Store distribution), select the App ID and link the certificate. Download it and convert it:

   ```sh
   # macOS
   base64 -i <path-to-profile.mobileprovision> | pbcopy
   ```

   Use the clipboard contents as `IOS_MOBILE_PROVISION`.

The certificate type must match the export method, as the list below shows.

- `debugging`: Apple Development or iOS App Development.
- `app-store-connect`: Apple Distribution or iOS Distribution (App Store Connect and Ad Hoc).
- `ad-hoc`: Apple Distribution or iOS Distribution (App Store Connect and Ad Hoc).

## Updater signing key

The updater signature is independent of operating system code signing: it proves to an already-installed copy of the app that an update came from you. Signature verification cannot be turned off. The full updater setup is in `07-distribute.md`; the signing part is summarized here so that every secret is on one page.

1. Generate the key pair. The docs' commands are:

   ```sh
   # macOS / Linux (any OS with a POSIX shell)
   bunx tauri signer generate -w ~/.tauri/myapp.key
   npm run tauri signer generate -- -w ~/.tauri/myapp.key
   ```

   This writes the private key to `~/.tauri/myapp.key` and the public key to `~/.tauri/myapp.key.pub`. The docs warn never to share the private key and that losing it means you can never again publish updates to users who already have the app.

2. Put the **content** of the `.pub` file (not its path) in `plugins.updater.pubkey` in `tauri.conf.json`, and set `bundle.createUpdaterArtifacts` to `true` so the build emits signatures.

3. At build time, put the private key in the environment. The docs state that `.env` files do **not** work.

   ```sh
   # macOS / Linux
   export TAURI_SIGNING_PRIVATE_KEY="Path or content of your private key"
   export TAURI_SIGNING_PRIVATE_KEY_PASSWORD=""
   ```

   ```powershell
   # Windows PowerShell
   $env:TAURI_SIGNING_PRIVATE_KEY="Path or content of your private key"
   $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD=""
   ```

In CI, store the key content and its password as the secrets `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` and pass them in the `env` of the build step; `12-pipelines-ci.md` shows where.

## Where each secret goes: checklist for a generated app

The list below is the order in which an app owner normally sets things up, with the place each value ends up.

1. **Updater (if the app uses the auto-update module):** run `tauri signer generate`, put the public key content in `plugins.updater.pubkey`, and add `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` as repository secrets.
2. **macOS:** keep `"signingIdentity": "-"` until you have a Developer ID certificate; then add `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `KEYCHAIN_PASSWORD` and either `APPLE_API_ISSUER` + `APPLE_API_KEY` + the `.p8` key, or `APPLE_ID` + `APPLE_PASSWORD` + `APPLE_TEAM_ID`, as repository secrets.
3. **Windows:** choose one method. For a store certificate, add `WINDOWS_CERTIFICATE` and `WINDOWS_CERTIFICATE_PASSWORD` as secrets and set the three `bundle.windows` keys. For Azure, add `AZURE_CLIENT_ID`, `AZURE_TENANT_ID` and `AZURE_CLIENT_SECRET` and set `bundle.windows.signCommand`.
4. **Linux (optional):** add the GPG key and passphrase as secrets and map them to `SIGN`/`APPIMAGETOOL_SIGN_PASSPHRASE` or `TAURI_SIGNING_RPM_KEY`/`TAURI_SIGNING_RPM_KEY_PASSPHRASE`.
5. **Android (if enabled):** add `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` and `ANDROID_KEY_BASE64`, and add the `signingConfigs` block to `build.gradle.kts`.
6. **iOS (if enabled):** set `bundle.iOS.developmentTeam` and add the App Store Connect API key secrets, or the three `IOS_*` secrets for manual signing.

Nothing in this checklist belongs in the repository itself: certificates, keystores, `.p8` keys and `keystore.properties` stay out of version control, in line with the builder's rule that build credentials live only in environment variables.

## UNVERIFIED and inconsistencies

The items below could not be confirmed from the sources, or the sources disagree.

- **UNVERIFIED:** whether setting `APPLE_SIGNING_IDENTITY` to `-` in the environment (rather than `signingIdentity` in the config) also produces an ad-hoc signature. The docs only show the config form.
- **UNVERIFIED:** how the Tauri CLI treats signing variables that are present but empty (which is what GitHub gives a workflow when a referenced secret does not exist). The workflows in `12-pipelines-ci.md` therefore keep the signing variables in clearly marked optional blocks.
- The macOS docs example greps `"Apple Development"` and references a non-existent `prepare` job; the `tauri-action` example greps `"Developer ID Application"`. Use the latter for distribution outside the App Store.
- The App Store page uses the shell variable name `APPLE_API_KEY_ID` in its `altool` command, whereas the variable Tauri reads is `APPLE_API_KEY`. Both hold the same Key ID value.
