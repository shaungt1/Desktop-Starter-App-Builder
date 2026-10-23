---
name: desktop-extension
description: Change a generated browser extension safely: add a message, setting, permission, content script or entrypoint. Use when the project is a browser extension (base `extension`) and the task touches the popup, options page, background worker, content scripts or the manifest.
---

# Browser Extension Changes

This skill belongs to Desktop Starter App Builder. `AGENT_START.md` in the builder root is the authority; if this skill and that file disagree, follow `AGENT_START.md`.

## Steps
1. Read the project's `AGENTS.md` and `docs/extension/AGENT_REFERENCE.md`; for permissions, content scripts or store rules also the matching page in `docs/extension/`.
2. Add a message by extending `messages` in `src/lib/messaging.ts` (Zod schemas for request and response), handling it in `entrypoints/background.ts`, and calling `sendMessage` from the popup, options page or content script.
3. Add a saved value as a typed item in `src/lib/settings.ts`; read it in React with `useStorageItem`.
4. Run code on pages from `entrypoints/content.ts` (or a new `entrypoints/<name>.content.ts`); keep `matches` as narrow as the feature allows and treat everything read from the page as untrusted.
5. Add a permission in `wxt.config.ts` only when a feature cannot work without it. Say which permission and why in the report. Prefer `activeTab` or an optional permission to broad host access.
6. For a side panel, context menu or page overlay use `bash start.sh module add <side-panel|context-menu|content-ui> <project folder>` from the builder; never copy module files by hand.
7. Write a Vitest test for new logic and a Playwright test in `tests/e2e/` if a user flow changed. Run `bun run verify`, then `bun run test:e2e`, then `bun run build` and `bun run build:firefox`.

## Done when
`bun run verify` and `bun run test:e2e` pass, both browser builds succeed, and the report lists every permission or match pattern added.
