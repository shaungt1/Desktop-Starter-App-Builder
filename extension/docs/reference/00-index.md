# Browser extension reference set: index

Source pages:
- WXT guide pages on wxt.dev (project structure, entrypoints, manifest, target different browsers, content scripts, storage, unit testing, end-to-end testing, extension APIs, messaging, browser startup, TypeScript, publishing, FAQ), fetched 2026-10-23
- developer.chrome.com extensions documentation and Chrome Web Store documentation, pages listed in the files that use them (fetched 2026-10-23)
- developer.mozilla.org WebExtensions pages and extensionworkshop.com pages, listed in the files that use them (fetched 2026-10-23)
- learn.microsoft.com Microsoft Edge extension pages and developer.apple.com Safari web extension pages, listed in the files that use them (fetched 2026-10-23)
- playwright.dev pages "Chrome extensions" and "Continuous Integration" (fetched 2026-10-23)
- WXT 0.21.4 installed in a scratch folder outside this repository, where a small probe extension was built for Chrome, Edge, Firefox and Safari, zipped, run in development mode and tested with Playwright 1.64.1 on Windows (2026-10-23). Statements that come from that run say "in a probe build".
- This repository on 2026-10-23: `extension/template/`, `extension/modules/`, `docs/CONVENTIONS.md`
- `npm view <package> version` for version numbers; `gh api repos/<owner>/<repo>/releases/latest` for the GitHub Action versions

Verified on 2026-10-23

## What this set is

This folder is a condensed reference for building, testing and publishing apps generated on this builder's **browser extension** base. A **browser extension** is a small program that a browser loads to add features to the browser itself or to the web pages it shows. The base produces **Manifest V3** extensions. Manifest V3 (MV3) is the current extension platform of Chromium browsers (Chrome and Edge), in which the extension's background code runs as a short-lived service worker and may not load code from the network. The extension is built with **WXT**, a framework that turns a folder of files into a ready-to-load extension for several browsers, together with React, TypeScript, Tailwind CSS 4, Vitest (unit tests) and Playwright (end-to-end tests).

Each file was written from the sources listed at its top, not from memory. Statements that could not be checked against a source are marked **UNVERIFIED**, and differences between a source and the template are called out as such. The set is written for two readers: a person preparing a release by hand, and an AI coding agent working inside a generated extension. It complements `extension/docs/AGENT_REFERENCE.md` (step-by-step recipes for code changes), which this set does not repeat. In a generated extension these files are copied to `docs/extension/`.

## Version numbers on 2026-10-23

The table below lists the versions the set refers to. They come from `npm view` and from `extension/template/package.json`. The last column says where the template stands when it differs from the newest release.

| Package | Newest release | In the template |
| --- | --- | --- |
| `wxt` | 0.21.4 | `^0.21.4` |
| `@wxt-dev/module-react` | 1.2.2 | `^1.2.2` |
| `react` | 19.3.1 | `^19.3.1` |
| `tailwindcss` | 4.3.3 | `^4.3.3` |
| `@tailwindcss/vite` | 4.3.3 | `^4.3.3` |
| `vitest` | 5.0.5 | `^5.0.5` |
| `@playwright/test` | 1.64.1 | `^1.64.1` |
| `typescript` | 7.0.2 | `6.0.3` (pinned) |
| `@biomejs/biome` | 2.6.2 | `2.6.2` (pinned) |
| `zod` | 4.6.7 | `^4.6.7` |
| `lucide-react` | 1.61.0 | `^1.61.0` |
| `motion` | 14.6.0 | `^14.6.0` |

Three packages arrive through WXT itself rather than the template's `package.json`. `@wxt-dev/storage` 1.3.0 is the storage library behind `wxt/utils/storage`; `@webext-core/fake-browser` 2.0.1 is the in-memory browser used by `wxt/testing/fake-browser`; and `publish-browser-extension` 6.2.0 is the tool that runs when `wxt submit` is typed (its help text prints `publish-extension/6.2.0`). The newest `web-ext` release is 10.8.0; WXT lists it only as an optional peer dependency, and `04-content-scripts-and-ui.md` and `05-testing.md` explain what that means for `bun run dev`.

## Files and when to read them

The list below says what each file covers and when to open it.

1. **`01-architecture-and-project-files.md`**: the parts of a Manifest V3 extension (manifest, service worker, content scripts, popup, options page, side panel, offscreen documents, web-accessible resources); how WXT builds `entrypoints/` into a manifest and one output folder per browser; and a table of every file in a generated extension. Read it first in an unfamiliar extension.
2. **`02-permissions-and-security.md`**: permissions, host permissions, optional permissions and `activeTab`; the content security policy; the ban on remotely hosted code; handling user data; validating messages; keeping secrets out of the extension; and how store review treats broad permissions. Read it before adding a permission or a match pattern.
3. **`03-messaging-and-storage.md`**: one-time messages and ports, the template's Zod-validated message protocol, the storage areas with their quotas, WXT's storage helper, and the service-worker lifecycle mistakes that lose data. Read it before adding a message, a setting or background logic.
4. **`04-content-scripts-and-ui.md`**: match patterns, run timing, the isolated and main worlds, injecting a React panel through a shadow root with Tailwind, single-page-application navigation, talking to the page, and injecting with `chrome.scripting`. Read it before touching `entrypoints/content.ts` or adding a page overlay.
5. **`05-testing.md`**: Vitest with WXT's plugin and in-memory browser, Playwright with a persistent Chromium context and the built extension, continuous integration, and what cannot be automated. Read it when writing tests or changing CI.
6. **`06-browsers-and-cross-browser.md`**: Chrome, Edge, Firefox and Safari: what is shared, what differs, and how WXT builds each. Read it before a Firefox or Safari release.
7. **`07-publishing-and-stores.md`**: the Chrome Web Store, Firefox Add-ons, Microsoft Edge Add-ons and Safari distribution; `wxt zip` and `wxt submit` with their secret names; the release workflow; updating a listing; and what the account owner must do by hand. Read it before the first release and before every later one.

## Conventions used in this set

Commands are given with Bun first and npm second, and each command block states the operating system it applies to when that matters. Paths such as `src/lib/messaging.ts` are relative to the root of a generated extension; paths beginning `extension/` or `docs/` are relative to this builder repository. Placeholders in angle brackets, such as `<extension-id>`, are replaced with real values before running. Browser API calls are written with the `browser` object imported from `wxt/browser`, which WXT resolves to `browser` in Firefox and `chrome` in Chromium browsers; pages quoted from the Chrome documentation use the same names.
