# Browser extension base

This folder holds everything the builder uses to generate browser extensions: the
template, the modules, the agent reference and the prompts. The builder copies from
here; nothing in this folder is meant to be run directly.

## Purpose and best use

A browser extension is a small program the user adds to Chrome, Edge or Firefox. It
runs inside the browser: it can read and change the web pages the user visits, add a
toolbar button (a **popup**), a **side panel**, a right-click menu item or a page
overlay, and react to browsing activity. Choose it when the product is something the
user does while browsing, such as clipping or annotating page content, adding a panel
to a site they already use, or a companion to a web product. One codebase ships to the
Chrome Web Store, Microsoft Edge Add-ons and Firefox Add-ons, and there is no installer
and no code-signing certificate, which makes it the quickest base for a proof of
concept. Its limits are the browser's: no window of its own, no files outside the
browser sandbox, no work while the browser is closed, and a store review of every
permission it asks for. The comparison with the desktop bases is in
[`../docs/CHOOSING_A_BASE.md`](../docs/CHOOSING_A_BASE.md).

## Stack

The template uses the following, all pinned in `template/package.json`:

| Concern | Choice |
| --- | --- |
| Framework | WXT (builds the manifest from `entrypoints/`, one output folder per browser, zips for the stores) |
| Manifest | Manifest V3 (Chrome, Edge); Firefox builds as Manifest V2 by WXT's default |
| Interface | React 19, Tailwind CSS 4, shadcn-style components, Motion |
| Messaging and storage | A typed, Zod-validated message protocol (`src/lib/messaging.ts`) and typed WXT storage items (`src/lib/settings.ts`) |
| Tests | Vitest with WXT's in-memory browser API (`fakeBrowser`), Playwright loading the built extension into Chromium |
| Lint and format | Biome 2 |
| Package manager | Bun (default) or npm |

## Folder map

The table below describes each subfolder.

| Folder | Contents |
| --- | --- |
| `template/` | The core extension. Placeholders such as `__APP_NAME__` are filled from the plan. |
| `modules/<id>/` | Optional modules: `side-panel`, `context-menu`, `content-ui`. |
| `docs/` | `AGENT_REFERENCE.md` (rules and recipes for agents) and `reference/` (architecture, permissions, messaging and storage, content scripts, testing, browsers, publishing). Both are copied into every generated extension as `docs/extension/`. |
| `prompts/` | Ready-made prompts for setting up and extending extensions with an agent. |

## Setting up an extension

Manually: follow [`../QUICKSTART.md`](../QUICKSTART.md) with `"base": "extension"` in
the plan (`plans/examples/extension-basic.json` is a starting point). With an agent:
paste [`prompts/setup-extension.md`](prompts/setup-extension.md) into your agent from
the builder folder.
