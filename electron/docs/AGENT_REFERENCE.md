# Electron agent reference

This reference gives an AI agent exact recipes for the most common changes in
an app generated on the Electron base. Each recipe states where the change goes,
the code pattern to follow and how to prove it works. The app's own
`AGENTS.md` lists the rules; this document shows how to follow them.

## Processes and where code runs

An Electron app runs three kinds of code. The **main process**
(`src/main`) is Node.js with full operating-system access; it owns windows,
files, the database and the network. The **preload script**
(`src/preload/preload.ts`) runs before the page with access to a small part of
Electron; in this template it only forwards one `MessagePort`. The
**renderer** (`src/renderer`) is the React page and has no Node access.
Workers in `src/main/workers` run in separate Node processes started with
`utilityProcess.fork`.

## Recipe: add an IPC procedure

1. Decide which module owns it. For a core capability, edit
   `src/main/ipc/core-router.ts`; otherwise edit the module's
   `src/main/modules/<id>/index.ts`.
2. Define it with the shared builder, validating input with Zod:

   ```ts
   import { z } from "zod";
   import { procedure } from "../../ipc/procedure";

   const renameNote = procedure
     .input(z.object({ id: z.number().int().positive(), title: z.string().trim().min(1).max(200) }))
     .handler(({ input, context }) => {
       // context.window is the calling BrowserWindow (or null)
       return repository().rename(input.id, input.title);
     });
   ```

3. Add it to the module's `router` object (or to `coreRouter`).
4. Call it from the interface: `await ipc.database.renameNote({ id, title })`.
   The type of the call comes from the router, so `tsc` catches mistakes.
5. Prove it: a unit test for the logic, then `bun run verify`.

## Recipe: add a screen

1. Create `src/renderer/screens/<name>.tsx` exporting a component (with the Next.js frontend, also add `src/app/<name>/page.tsx` rendering it).
2. Register a route in `src/renderer/router.tsx` with `createRoute` under
   `layoutRoute`, and add a link to `NAV_ITEMS` in
   `src/renderer/components/app-layout.tsx`.
3. Load data with `useQuery({ queryKey: [...], queryFn: () => ipc.<...>() })`.
4. Add a component test next to the page (`<name>.test.tsx`, starting with
   `// @vitest-environment jsdom`) that mocks `@/lib/ipc`, as `home.test.tsx` does.

## Recipe: add background work

1. Create `src/main/workers/<name>.ts`. `forge.config.ts` bundles every file in
   that folder to `.vite/build/<name>.cjs` automatically.
2. Inside the worker, receive and send messages through `process.parentPort`.
3. Start it from a module's `setup` with
   `utilityProcess.fork(workerPath("<name>"))` (from `src/main/resources.ts`),
   restart it on unexpected exit, and kill it in `dispose`.
4. Set `lifecycle.keepRunningInBackground = true` if it must keep running after
   the window closes (the background module does this and adds a tray icon).

## Recipe: call an external API from the main process

Use `net.fetch` from Electron (it honors the system proxy). If the API needs the
signed-in user's token, call `getAccessToken()` exported by the auth-oidc
module. Never send tokens to the renderer.

## Recipe: allow a new origin or permission

Origins the window may navigate to come from `trustedOrigins()` in
`src/main/content.ts` (remote profile: `remoteUrl` and `allowedOrigins` in
`app.config.json`). Page permissions such as notifications are allowed by name
in `ALLOWED_PERMISSIONS` in `src/main/security.ts`. Add the narrowest entry and
explain the reason in the change.

## Recipe: change the database schema

Append a migration to `src/main/modules/database/migrations.ts` with the next
version number, then update the repository functions and their tests. Each
migration runs once, in a transaction, and failures roll back. The database
file is `app.db` in the user-data folder.

## Facts that prevent common mistakes

1. Forge's Vite plugin names bundles after entry files: `main.ts` becomes
   `main.cjs`. Keep entry names unique.
2. `node:sqlite` must stay external in `vite.main.config.mts`.
3. In a packaged app, `app.getAppPath()` is `resources/app.asar`; extra resources
   (`assets/icon.png`, `web-export/`) sit next to it. Use `resourcePath()` and
   `resourcesFolder()` from `src/main/resources.ts` rather than building paths by hand.
4. Fuses disable `ELECTRON_RUN_AS_NODE`, `NODE_OPTIONS` and `--inspect` in
   packaged builds; end-to-end tests therefore launch the packaged
   `app.asar` with the development Electron binary.
5. Bun runs dependency install scripts only for `trustedDependencies`.
