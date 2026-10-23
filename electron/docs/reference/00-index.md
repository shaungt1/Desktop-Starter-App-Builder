# Electron reference set: index

Source pages:
- electron/electron docs folder, commit `c80c71c7c6b1` (2026-10-22)
- electron-forge/electron-forge-docs, commit `494fe76a3943` (2026-10-21)
- electron/forge source, commit `16d47dc29387` (2026-10-21)
- vercel/next.js docs folder, commit `7657545d157a` (2026-10-22)
- This repository at commit `2d7931e126ed` plus work in progress on 2026-10-22: `electron/template/`, `electron/profiles/`, `electron/modules/`, `shared/renderer/`, `electron/docs/AGENT_REFERENCE.md`, `docs/RELEASE_AND_SIGNING.md`
- Web pages fetched on 2026-10-22, listed in the files that use them: the GitHub pages of `actions/checkout`, `actions/setup-node`, `oven-sh/setup-bun` and `apple-actions/import-codesign-certs`; Playwright's Electron API page; GitHub's page on using secrets
- `npm view <package> version` for version numbers

Verified on 2026-10-22

## What this set is

This folder is a condensed reference for building, signing, distributing and testing apps generated on this builder's **Electron** base. Electron is a framework that builds desktop applications from the Chromium browser engine and the Node.js runtime; **Electron Forge** is its official tool for packaging those apps and producing installers. Each file was written from the documentation sources and code listed at its top, not from memory. Statements that could not be checked against a source are marked **UNVERIFIED**, and suggested changes that the template does not yet contain are labelled as proposals.

The set is written for two readers: a person setting up a release by hand, and an AI coding agent working inside a generated app. It complements two existing documents, which it does not repeat: `electron/docs/AGENT_REFERENCE.md` (step-by-step recipes for code changes) and `docs/RELEASE_AND_SIGNING.md` (the short release overview).

## Version numbers on 2026-10-22

The table below lists the versions the set refers to, from `npm view` and from the template's `package.json`.

| Package | Version |
| --- | --- |
| `electron` | 45.0.0 (pinned in the template) |
| `@electron-forge/cli` and every `@electron-forge/maker-*` and `@electron-forge/publisher-*` | 8.0.1 |
| `next` | 16.4.2 |
| `update-electron-app` | 3.3.0 |
| `@playwright/test` | 1.64.1 |
| `vitest` | 5.0.5 |
| `electron-playwright-helpers` | 3.1.2 |
| `dotenv-cli` | 11.0.0 |

## Files and when to read them

The list below says what each file covers and when to open it.

1. **`01-architecture-and-project-files.md`**: the main, renderer, preload and utility processes; context isolation, sandbox and fuses; ASAR; and a table of every file in a generated app with its responsibility. Read it first in an unfamiliar app, or before changing any security setting.
2. **`02-makers-and-distribution.md`**: every Forge maker (Squirrel.Windows, WiX MSI, MSIX, AppX, DMG, pkg, ZIP, deb, RPM, Flatpak, Snap) with what it builds, the operating system that must build it, its configuration keys and the packages and tools to install. Read it before adding an installer format.
3. **`03-signing.md`**: why Windows (SmartScreen) and macOS (Gatekeeper) need signing; Apple certificates, `osxSign`, `osxNotarize` and the `APPLE_*` variables; Windows certificate types, SignTool, `windowsSign`, the `WINDOWS_*` variables and Azure Artifact Signing. Read it before a signed release.
4. **`04-publishing-and-updates.md`**: every Forge publisher, the automatic-update options that work with Forge, and a complete GitHub Actions release workflow for Windows, macOS and Linux with verified action versions. Read it before setting up releases or updates.
5. **`05-app-stores.md`**: the Mac App Store (MAS build, provisioning profile, entitlements, `.pkg`), the Microsoft Store (MSIX) and the Snap Store, with the accounts needed and common pitfalls. Read it before a store submission.
6. **`06-nextjs-frontend.md`**: using a Next.js static export as the app's interface through the exported profile's `app://` scheme, why `file://` fails, development against `next dev`, unsupported Next.js features and `"use client"`. Read it when the interface is a Next.js app.
7. **`07-testing.md`**: Vitest unit tests, Playwright end-to-end tests against the packaged app, and headless runs on Linux with Xvfb. Read it when writing tests or setting up CI.

## Conventions used in this set

Commands are given with Bun first and npm second, and each command block states the operating system it applies to when that matters. Paths such as `src/main/window.ts` are relative to the root of a generated app; paths beginning `electron/` or `docs/` are relative to this builder repository. Placeholders in angle brackets, such as `<electron-app>`, are replaced with real values before running.
