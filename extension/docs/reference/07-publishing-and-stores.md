# Publishing and stores

Source pages:
- https://wxt.dev/guide/essentials/publishing.html and https://wxt.dev/guide/essentials/config/manifest.html (fetched 2026-10-23)
- https://github.com/aklinker1/publish-browser-extension/blob/main/docs/config-reference.md (fetched 2026-10-23); `wxt submit --help` and `wxt zip --help` output of WXT 0.21.4 (which runs `publish-extension` 6.2.0), read in a scratch install on 2026-10-23
- https://developer.chrome.com/docs/webstore/register, https://developer.chrome.com/docs/webstore/publish, https://developer.chrome.com/docs/webstore/images, https://developer.chrome.com/docs/webstore/cws-dashboard-privacy, https://developer.chrome.com/docs/webstore/cws-dashboard-distribution, https://developer.chrome.com/docs/webstore/review-process, https://developer.chrome.com/docs/webstore/update, https://developer.chrome.com/docs/webstore/program-policies/policies, https://developer.chrome.com/docs/webstore/using-api, https://developer.chrome.com/docs/webstore/faq (fetched 2026-10-23)
- https://developer.chrome.com/docs/extensions/reference/manifest/version, https://developer.chrome.com/docs/extensions/develop/migrate/mv2-deprecation-timeline, https://developer.chrome.com/docs/extensions/how-to/distribute/install-extensions (fetched 2026-10-23)
- https://extensionworkshop.com/documentation/publish/submitting-an-add-on/, https://extensionworkshop.com/documentation/publish/source-code-submission/, https://extensionworkshop.com/documentation/enterprise/enterprise-distribution/ (fetched 2026-10-23)
- https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_specific_settings (fetched 2026-10-23)
- https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/create-dev-account, https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension, https://learn.microsoft.com/en-us/microsoft-edge/extensions/update/api/using-addons-api (fetched 2026-10-23)
- https://developer.apple.com/documentation/safariservices/distributing-your-safari-web-extension and https://developer.apple.com/documentation/safariservices/packaging-and-distributing-safari-web-extensions-with-app-store-connect (fetched 2026-10-23)
- `gh api repos/<owner>/<repo>/releases/latest` for `actions/checkout` (v7.0.1), `actions/setup-node` (v7.1.0), `oven-sh/setup-bun` (v2.2.0), `actions/upload-artifact` (v7.0.2), `actions/download-artifact` (v8.0.2)
- This repository: `extension/template/package.json`, `.github/workflows/release.yml`, `.github/workflows/ci.yml`, `.gitignore`, `wxt.config.ts`

Verified on 2026-10-23

A **store** is a browser vendor's catalogue from which users install extensions; the store reviews each upload, hosts the package and delivers updates. This file covers the four stores for this base, the commands that package an extension, the tool that uploads it, a release workflow, and the split between what an agent can do and what the account owner must do by hand. Nothing here is submitted automatically: every store submission needs the owner's approval for each release.

## 1. Overview

The table below summarises the stores. "Cost" is stated only where an official page read for this set states it.

| Store | Package | Account | Cost |
| --- | --- | --- | --- |
| Chrome Web Store (also installs in Edge) | `.zip` of `.output/chrome-mv3` from `wxt zip` | A Chrome Web Store developer account | One-time registration fee; the amount is not stated on the Chrome pages read (**UNVERIFIED**) |
| Firefox Add-ons (AMO) | `.zip` from `wxt zip -b firefox`, plus a sources `.zip` | A Mozilla account and the Add-ons Developer Hub | Not stated on the pages read (**UNVERIFIED**) |
| Microsoft Edge Add-ons | The Chrome `.zip` | A Partner Center developer account | "There is no registration fee for submitting extensions to the Microsoft Edge program" |
| Safari (App Store) | An app that wraps the extension, built with Apple's packager | Apple Developer Program membership | Not stated on the Apple pages read (**UNVERIFIED**) |

## 2. Versioning

The manifest `version` is the number the stores compare. WXT takes it from `version` in `package.json`, cleaned of invalid suffixes: `1.3.0-alpha2` becomes `"version": "1.3.0"` with `"version_name": "1.3.0-alpha2"`. Chrome's manifest page defines the format: one to four dot-separated integers, each from 0 to 65535, with no leading zeros (`032` is invalid) and not all zeros (`0` and `0.0.0.0` are invalid; `0.1.0.0` is valid). Versions are compared from the left, so 1.2.0 is newer than 1.1.9.9999, and a missing integer counts as zero. The optional `version_name` is only displayed. The Chrome update page says every new version must be larger than the previous one, and the Chrome Web Store API's upload fails if the manifest version has not increased. Whether Firefox Add-ons and Edge Add-ons apply the same rules is not stated on the pages read (**UNVERIFIED**); use the same format for all stores.

To release, change `version` in `package.json` (for example `1.0.0` to `1.0.1`), run `bun run verify`, then build the ZIP files (section 3). Do not edit a version number inside `manifest.json`; it is generated.

## 3. Building the ZIP files: `wxt zip`

`wxt zip` builds for production and zips the output. The commands below are typed from the extension's folder; the template's scripts wrap them.

```bash
bun run zip
bun run zip:firefox
bun run zip:all
```

```bash
npm run zip
npm run zip:firefox
npm run zip:all
```

In a probe project with `package.json` name `probe` and version `1.0.0`, `wxt zip` wrote `.output/probe-1.0.0-chrome.zip`, and `wxt zip -b firefox` wrote `.output/probe-1.0.0-firefox.zip` and `.output/probe-1.0.0-sources.zip`. The names follow the default templates `{{name}}-{{packageVersion}}-{{browser}}{{modeSuffix}}.zip` and `{{name}}-{{packageVersion}}-sources{{modeSuffix}}.zip`, which the `zip` option of `wxt.config.ts` can change (`name`, `artifactTemplate`, `sourcesTemplate`). The Chrome ZIP is the one uploaded to the Chrome Web Store and to Edge; a separate `wxt zip -b edge` is needed only for Edge-specific features (WXT's publishing page). WXT creates the sources ZIP by default for `firefox` and `opera` targets, and `wxt zip --sources` forces one for any target.

### 3.1 The Firefox sources ZIP

Firefox reviewers must be able to rebuild the submitted add-on. Extension Workshop requires a source package when the add-on was built with a minifier, a bundler such as webpack, a template engine or any custom preprocessing tool; an extension built by WXT (which bundles with Vite) is in that case. The requirements below are from its source-code submission page.

1. Provide a README with the operating system, the required tool versions with installation instructions, and every command needed to produce an identical copy. Tools must be open source and run locally.
2. Include the lockfile (for example `package-lock.json`) and state Node and npm versions. If no environment is stated, reviewers use Node 24.14.0 and npm 11.9.0 on Ubuntu 24.04.4 LTS; if the environment differs, state the differences or the submission may be rejected.
3. The reviewer rebuilds and compares: "There must be no differences" between the rebuilt output and the submitted add-on.
4. Obfuscated code is prohibited; minified code is allowed with source. The source package may be up to 200 MB.

WXT's part, from its publishing page and the `zip` option types in WXT 0.21.4: the sources ZIP excludes hidden files and directories (names starting with `.`), `node_modules`, test files and directories, and the output directory; `zip.includeSources`, `zip.excludeSources` and `zip.sourcesRoot` adjust it; `zip.dotSources` includes hidden files (the type documentation warns it may include files with secrets). `.env` files can change the chunk hashes of the build, so delete the `.env` file before `wxt zip -b firefox` or include it deliberately without secrets. WXT tells developers to check the sources ZIP by extracting it and running the install and build commands, and to put them in `README.md` or `SOURCE_CODE_REVIEW.md`; for this base those are shown below, and the output of `wxt build -b firefox` in the project must match the output built inside the ZIP.

```bash
bun install
bun run zip:firefox
```

```bash
npm install
npm run zip:firefox
```

The reviewers' default environment names Node and npm, not Bun. State in the README which Bun version builds the add-on and that `bun install` reads the lockfile; whether Mozilla's reviewers accept a Bun-based build was not stated on the pages read (**UNVERIFIED**), and npm commands that build the same output are the safer instruction if they do. Private packages can be downloaded into the ZIP with `zip.downloadPackages`, which uses `npm pack` and therefore needs a `.npmrc`.

## 4. Chrome Web Store

### 4.1 Account

A Chrome Web Store developer account is created in the Developer Dashboard. The registration page says a one-time registration fee is paid on first access after accepting the developer agreement; the amount, accepted payment methods and any identity verification are not stated on that page or on the Chrome Web Store FAQ page (**UNVERIFIED**). The developer email entered when creating the account cannot be changed afterwards. The Chrome Web Store API page says 2-step verification must be enabled on the Google account to publish or update an extension. These steps belong to the account owner (section 11).

### 4.2 First submission

The publish page gives the dashboard flow: sign in, choose Add new item, upload the ZIP (at most 2 GB), then complete the left-menu tabs and choose Submit for Review. The tabs are listed below.

1. **Package:** the uploaded item. Remove any permission the dashboard lists but the manifest does not need, and upload again.
2. **Store listing:** the description and images. Required: a 128x128 PNG store icon (it ships inside the ZIP, as `public/icon/128.png`; the artwork should be 96x96 with about 16 px transparent padding per side) and at least one screenshot, up to five, each 1280x800 or 640x400 pixels with square corners and no padding. Optional: a 440x280 small promotional image and a 1400x560 marquee image (only the marquee makes an extension eligible for the marquee feature). The page does not specify file formats for screenshots and promotional images.
3. **Privacy practices:** the single purpose description (the extension "must have a single purpose that is narrow and easy to understand"), a justification for every permission, the remote code declaration, the data usage disclosures and certification, and the privacy policy URL. Disclosures shown to users should match the privacy policy.
4. **Distribution:** whether the item is free or paid, regions (all, or chosen countries), and visibility: **Public** (listed), **Unlisted** (no listing; anyone with the URL can install) or **Private** (installable by trusted testers added by email in the account settings, and by members of Google Groups the developer owns). All three are subject to the same policies and review.
5. **Test instructions:** only if reviewers need credentials or steps.

A new publisher can have up to two published extensions; an increase can be requested. By default a reviewed item is published automatically; uncheck the box in the confirmation dialog (or use Defer publish) to publish manually later, within 30 days, after which the staged submission reverts to a draft.

### 4.3 Review

The review page lists signals that prompt closer examination: new developers, new extensions, dangerous permission requests, significant code changes, broad host permissions (`<all_urls>`, `https://*/*`, `*://*/*`), sensitive execution permissions, and large or hard-to-review code; obfuscation is disallowed. Outcomes are Approved, Rejected (the email names the violated policy; the live listing is unchanged), Warning and Takedown; a takedown or warning is appealed from the item's detail page, an account suspension from the account page. Durations are not given here because the store changes them.

### 4.4 Updates and rollout

To update, increase the version, build `bun run zip`, open the item, use Upload New Package on the Package tab, review the Store listing, Privacy and Distribution tabs, and submit. Submitting does not affect the live item; existing users keep the current version until the update is published. A staged (percentage) rollout is available only for published items with more than 10,000 seven-day active users: raise the percentage later without a new review, one partial rollout at a time. When an update requires more permissions, users are prompted to accept them or disable the extension.

### 4.5 The Chrome Web Store API

Chrome's API (v2) base is `https://chromewebstore.googleapis.com/v2/publishers/PUBLISHER_ID/items/EXTENSION_ID`, with `upload`, `publish`, `fetchStatus`, `setPublishedDeployPercentage` and `cancelSubmission`. The publisher id is in the dashboard under Publisher, Settings. The page says the Store listing and Privacy tabs must be complete before publishing a new item through the API, so a first listing is made by hand. The page describes an OAuth flow with a client id, client secret and refresh token, and says a service account is optional, with its steps on a separate page that was not opened (**UNVERIFIED**).

## 5. Firefox Add-ons (AMO)

1. **Account.** Sign in to the Add-ons Developer Hub with a Mozilla Account (create one if needed).
2. **Package.** The ZIP (`.zip`, `.xpi` or `.crx`) may be up to 200 MB. The manifest needs `browser_specific_settings.gecko.id` and, for new extensions from 2025-11-03, `data_collection_permissions` (`06-browsers-and-cross-browser.md`).
3. **Two paths.** "On this site" lists the add-on on addons.mozilla.org. "On your own" (self-distribution, an **unlisted** add-on) gives you a signed file to distribute yourself; the version is validated, then signed, and the signed file is downloaded from My Add-ons. If Firefox should handle updates, set `update_url` in `browser_specific_settings.gecko` to an update manifest.
4. **Upload steps (listed).** Upload the file on the Upload Version page; fix validator errors (warnings do not block but security or privacy warnings can cause review failure); choose platforms; say whether source code is needed and upload the sources ZIP; fill in the name, a unique add-on URL, summary, description, up to two categories for Firefox and up to two for Firefox for Android, support contact, license and privacy policy (required if the add-on transmits data); add notes for reviewers; choose Submit Version.
5. **After upload.** Listed add-ons are published and may still be reviewed afterwards; self-distributed add-ons receive a signed copy and may also be reviewed. New versions must be uploaded on the add-on's existing page so AMO treats them as updates.

## 6. Microsoft Edge Add-ons

1. **Account.** Register in Partner Center with a Microsoft account (an individual or company account; there is no registration fee). Company accounts go through a longer verification that includes confirmation by a company approver. The Edge program does not accept work or school accounts for registration.
2. **Package.** Upload the same ZIP as for Chrome. Remove `update_url` from the manifest if present and avoid "Chrome" in the name or description (Microsoft's porting page).
3. **Listing.** In Partner Center the steps are: package, availability (Public or Hidden, markets), properties (category required), privacy (single purpose, per-permission justification, remote code, data usage, privacy policy URL), store listing per language, and a final Publish with optional notes for certification (include test account details and, for updates, what changed). Required per language: a description of 250 to 10,000 characters and a logo (1:1, recommended 300x300, minimum 128x128). Optional: a 440x280 small tile, a 1400x560 large tile (PNG), up to six screenshots at 640x480 or 1280x800, a YouTube URL and search terms.
4. **API.** Updates to an existing product can be automated through the Edge Add-ons API (root `https://api.addons.microsoftedge.microsoft.com`): upload a package to `/v1/products/{productID}/submissions/draft/package`, check the upload operation, publish with `POST /v1/products/{productID}/submissions`, and check the publish operation. v1.1 uses an API key and client id sent as the headers `Authorization: ApiKey <key>` and `X-ClientID: <id>`; the page states that support for the older v1 access-token scheme would end on 2024-12-31. The API cannot create a product or change its metadata; those are done in Partner Center. Enable it under Publish API in Partner Center (Create API credentials); the key has an expiry date shown on that page.

## 7. Safari

Safari extensions ship inside an app through the App Store. The route (a Mac with Xcode, or the web packager in App Store Connect), the need for Apple Developer Program membership and the unsigned-testing options are in `06-browsers-and-cross-browser.md`, section 4. Apple's distribution page adds that macOS extensions can alternatively be signed with a Developer ID and notarized to distribute outside the Mac App Store. WXT does not create the app wrapper and `wxt submit` has no Safari target.

## 8. `wxt submit`: uploading from the command line

`wxt submit` runs `publish-extension` (6.2.0 with WXT 0.21.4). It uploads packages and submits them for review; WXT's page says that listings must be created by hand first and that versions are published automatically once approved.

### 8.1 First use

`wxt submit init` is an interactive walkthrough that initialises or updates the secrets and options for each store and, per WXT's page, writes a `.env.submit` file that `wxt submit` reads. The template's `.gitignore` ignores `.env.submit`. Always run a dry run first; it checks authentication without uploading, and is repeated after any change to the release process.

```bash
bunx wxt submit init
bunx wxt submit --dry-run --chrome-zip .output/<name>-<version>-chrome.zip --firefox-zip .output/<name>-<version>-firefox.zip --firefox-sources-zip .output/<name>-<version>-sources.zip --edge-zip .output/<name>-<version>-chrome.zip
```

```bash
npx wxt submit init
npx wxt submit --dry-run --chrome-zip .output/<name>-<version>-chrome.zip --firefox-zip .output/<name>-<version>-firefox.zip --firefox-sources-zip .output/<name>-<version>-sources.zip --edge-zip .output/<name>-<version>-chrome.zip
```

Remove `--dry-run` for the real submission. Each flag also has an environment variable (`--chrome-extension-id` is `CHROME_EXTENSION_ID`); in CI all variables are set on the submit step.

### 8.2 Secret names

The table below lists the environment variable for each setting, from the `publish-extension` configuration reference and its `--help` output. Values of the secrets come from the store dashboards and are set as repository secrets, never committed.

| Store | Variable | Meaning |
| --- | --- | --- |
| Chrome | `CHROME_EXTENSION_ID` | The item's id |
| Chrome (API v2) | `CHROME_API_VERSION` (`v1.1` or `v2`), `CHROME_PUBLISHER_ID` | Select the API; publisher id for v2 |
| Chrome (API v2) | `CHROME_SERVICE_ACCOUNT_CLIENT_EMAIL` and `CHROME_SERVICE_ACCOUNT_PRIVATE_KEY`, or `CHROME_SERVICE_ACCOUNT_ACCESS_TOKEN` | Service-account credentials; the access token is exclusive with the other two |
| Chrome (API v2) | `CHROME_PUBLISH_TYPE`, `CHROME_CANCEL_PENDING`, `CHROME_SKIP_REVIEW` | `STAGED_PUBLISH` to avoid immediate publish; cancel a pending review first; skip review for update kinds that allow it |
| Chrome (API v1.1, deprecated) | `CHROME_CLIENT_ID`, `CHROME_CLIENT_SECRET`, `CHROME_REFRESH_TOKEN`, `CHROME_PUBLISH_TARGET`, `CHROME_REVIEW_EXEMPTION` | OAuth credentials and options; marked deprecated in the tool's help |
| Chrome | `CHROME_DEPLOY_PERCENTAGE`, `CHROME_SKIP_SUBMIT_REVIEW`, `CHROME_ZIP` | Rollout percentage 0 to 100; upload without submitting; zip path |
| Firefox | `FIREFOX_EXTENSION_ID`, `FIREFOX_JWT_ISSUER`, `FIREFOX_JWT_SECRET` | The add-on id and the Add-ons API keys |
| Firefox | `FIREFOX_CHANNEL` (`listed` or `unlisted`), `FIREFOX_COMPATIBILITY`, `FIREFOX_AMO_METADATA_FILE`, `FIREFOX_SKIP_SUBMIT_REVIEW`, `FIREFOX_ZIP`, `FIREFOX_SOURCES_ZIP` | Channel; `firefox,android`; metadata file; upload only; zip paths |
| Edge | `EDGE_PRODUCT_ID`, `EDGE_CLIENT_ID`, `EDGE_API_KEY` | Product id, client id and API key (Addons API v1.1) |
| Edge | `EDGE_SKIP_SUBMIT_REVIEW`, `EDGE_ZIP` | Upload only; zip path |

WXT's publishing page still lists only the four Chrome variables of the older scheme (`CHROME_EXTENSION_ID`, `CHROME_CLIENT_ID`, `CHROME_CLIENT_SECRET`, `CHROME_REFRESH_TOKEN`), the three Firefox variables, and no Edge variables; the table above is the current tool's list and is the one to follow. The tool's other subcommands are `set-deploy-percentage` and `status`.

## 9. The release workflow

The template's `.github/workflows/release.yml` has two jobs. The `package` job runs on a pushed `v*` tag or a manual start: it runs `bun run verify`, builds the store ZIP files with `bun run zip:all`, uploads them as a workflow artifact and, for a tag, attaches them to a draft GitHub release. The `submit` job runs only when someone starts the workflow by hand and ticks at least one store (Chrome, Firefox or Edge); it downloads the ZIP files and calls `wxt submit` for the ticked stores only. A pushed tag therefore never publishes anything, which keeps each store submission an explicit decision of the owner. The file below is the template's, copied verbatim. It has not been run on GitHub (**UNVERIFIED** as a whole); the action versions are the newest major releases found on 2026-10-23, and mixing `upload-artifact@v7` with `download-artifact@v8` was not checked beyond both tags existing.

```yaml
# Release workflow generated by Desktop Starter App Builder (docs/extension/07-publishing-and-stores.md).
#
# Push a tag such as v1.2.0 that matches package.json's version. The workflow
# verifies the extension, builds the store ZIP files and attaches them to a
# draft GitHub release. It does NOT upload to any store: submitting to the
# Chrome Web Store, Firefox Add-ons or Edge Add-ons needs the owner's approval
# for each release, so it runs only when you start this workflow by hand
# (Actions > Release > Run workflow) and tick the stores to submit to. Each
# store needs its secrets (listed in the "submit" job) saved in the repository.
name: Release

on:
  push:
    tags: ["v*"]
  workflow_dispatch:
    inputs:
      chrome:
        description: "Submit to the Chrome Web Store"
        type: boolean
        default: false
      firefox:
        description: "Submit to Firefox Add-ons (with the sources ZIP)"
        type: boolean
        default: false
      edge:
        description: "Submit to Microsoft Edge Add-ons (uses the Chrome ZIP)"
        type: boolean
        default: false

permissions:
  contents: write

jobs:
  package:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: oven-sh/setup-bun@v2 # @bun-only
      - uses: actions/setup-node@v7
        with:
          node-version: 22
      - run: bun install --frozen-lockfile
      - run: bun run verify
      - name: Build the store ZIP files (Chrome and Edge, Firefox plus its source ZIP)
        run: bun run zip:all
      - uses: actions/upload-artifact@v7
        with:
          name: store-zips
          path: .output/*.zip
      - name: Attach the ZIP files to a draft GitHub release
        if: startsWith(github.ref, 'refs/tags/')
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: gh release create "$GITHUB_REF_NAME" .output/*.zip --draft --generate-notes

  submit:
    if: github.event_name == 'workflow_dispatch' && (inputs.chrome || inputs.firefox || inputs.edge)
    needs: package
    runs-on: ubuntu-latest
    env:
      # Chrome Web Store API v2: a service account that is allowed to publish this item.
      CHROME_API_VERSION: v2
      CHROME_EXTENSION_ID: ${{ secrets.CHROME_EXTENSION_ID }}
      CHROME_PUBLISHER_ID: ${{ secrets.CHROME_PUBLISHER_ID }}
      CHROME_SERVICE_ACCOUNT_CLIENT_EMAIL: ${{ secrets.CHROME_SERVICE_ACCOUNT_CLIENT_EMAIL }}
      CHROME_SERVICE_ACCOUNT_PRIVATE_KEY: ${{ secrets.CHROME_SERVICE_ACCOUNT_PRIVATE_KEY }}
      # Firefox Add-ons (AMO) API keys.
      FIREFOX_EXTENSION_ID: ${{ secrets.FIREFOX_EXTENSION_ID }}
      FIREFOX_JWT_ISSUER: ${{ secrets.FIREFOX_JWT_ISSUER }}
      FIREFOX_JWT_SECRET: ${{ secrets.FIREFOX_JWT_SECRET }}
      # Microsoft Edge Add-ons API.
      EDGE_PRODUCT_ID: ${{ secrets.EDGE_PRODUCT_ID }}
      EDGE_CLIENT_ID: ${{ secrets.EDGE_CLIENT_ID }}
      EDGE_API_KEY: ${{ secrets.EDGE_API_KEY }}
    steps:
      - uses: actions/checkout@v7
      - uses: oven-sh/setup-bun@v2 # @bun-only
      - uses: actions/setup-node@v7
        with:
          node-version: 22
      - run: bun install --frozen-lockfile
      - uses: actions/download-artifact@v8
        with:
          name: store-zips
          path: .output
      - name: Submit to the selected stores
        run: |
          args=()
          if [ "${{ inputs.chrome }}" = "true" ]; then args+=(--chrome-zip "$(ls .output/*-chrome.zip)"); fi
          if [ "${{ inputs.firefox }}" = "true" ]; then
            args+=(--firefox-zip "$(ls .output/*-firefox.zip)" --firefox-sources-zip "$(ls .output/*-sources.zip)")
          fi
          if [ "${{ inputs.edge }}" = "true" ]; then args+=(--edge-zip "$(ls .output/*-chrome.zip)"); fi
          bunx wxt submit "${args[@]}"
```

Notes on the workflow. Create the secrets it names under the repository's Settings, Secrets and variables, Actions (GitHub's page on using secrets explains this); only the stores you tick need their secrets. The Chrome secrets assume Chrome Web Store API v2 with a service account; a project that keeps API v1.1 must use the deprecated OAuth variables from section 8 instead. Edge uses the Chrome ZIP, as WXT's publishing page states. For an extra human approval step, GitHub offers environments with required reviewers: add `environment: <name>` to the `submit` job after creating the environment (this GitHub feature was not checked against GitHub's documentation for this set, **UNVERIFIED**). Run the dry run from section 8 before the first real submission.

## 10. Self-hosting and enterprise installation

1. **Chrome and Edge.** Outside the store, a Chrome user can load an unpacked extension in Developer mode (for development). Chrome's alternative-installation page says that on Windows and macOS the `update_url` of externally installed extensions must point to the Chrome Web Store, that local CRX installs are blocked on those systems, and that the user confirms a prompt before the extension is enabled; Linux is more flexible (a preferences file may point at a self-hosted extension or a local CRX). Administrators can also manage installation through enterprise policies; the page links to the policy reference without describing individual policies, and the policy names were not checked (**UNVERIFIED**).
2. **Firefox.** Add-ons must be signed to install in standard or beta Firefox. The recommended self-distribution route is an unlisted submission to AMO, which returns a signed file that can be hosted behind a firewall or on a page. Unsigned add-ons work in Developer Edition, Nightly and ESR after turning off `xpinstall.signatures.required`. Extension Workshop names the **ExtensionSettings** policy as the recommended way to install add-ons automatically and points to its own reference for the keys, which were not read (**UNVERIFIED**).
3. **Self-hosting means self-updating.** Chrome and Edge builds distributed outside the store need an update mechanism that this base does not provide.

## 11. What the account owner does by hand and what an agent can do

The table below divides the work. An agent never creates accounts, pays, passes identity checks or stores secrets on its own, and never submits to a store without the owner's explicit approval for that release.

| Task | Owner by hand | Agent |
| --- | --- | --- |
| Create the Chrome developer account, pay the registration fee, enable 2-step verification | Yes | No |
| Create the Mozilla account and Add-ons Developer Hub access; Partner Center registration (Edge); Apple Developer Program enrollment | Yes (identity verification, payments, company approver) | No |
| Choose and host a privacy policy; give its URL | Yes (legal content and the URL) | May draft text for the owner to review |
| Create each store listing the first time (description, images, categories, distribution, test credentials) | Yes | May prepare the text and check image sizes |
| Answer the single-purpose and permission-justification fields | Reviews and submits | Drafts from the manifest and the comments in `wxt.config.ts` |
| Create API credentials (Chrome service account or OAuth, AMO JWT keys, Edge API key) and add them as repository secrets | Yes | No |
| Bump `version`, run `bun run verify`, `bun run zip:all`, inspect the ZIP contents and manifests | May | Yes |
| Write the Firefox README or `SOURCE_CODE_REVIEW.md` and check the sources ZIP builds | May | Yes |
| Run `wxt submit --dry-run` | May | Yes, after the owner has set the secrets |
| Run `wxt submit` for real, tag a `v*` release, start the Release workflow with `submit` | Approves each time | Only on explicit instruction |
| Respond to review rejections, warnings and appeals | Yes | Prepares the fix and the reply text |
| Safari: build the app wrapper in Xcode or App Store Connect, sign, submit | Yes | Prepares the web build |
