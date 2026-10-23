# Conventions

These conventions apply to the builder and to the code it generates. They
exist so that every module and template reads the same way, so that tools can
check them, and so that an agent can follow them without guessing.

## Naming

The table below lists the naming rule for each kind of name.

| Kind | Rule | Example |
| --- | --- | --- |
| Module id | kebab-case, matching its folder names | `secure-storage` |
| Electron IPC namespace | camelCase of the module id | `ipc.secureStorage.set(...)` |
| Rust module file | snake_case of the module id | `secure_storage.rs` |
| Tauri command | snake_case, prefixed by the module's area | `secret_set`, `fs_open_text_file` |
| TypeScript files | kebab-case | `notes-repository.ts` |
| React components | PascalCase exports in kebab-case files | `AppLayout` in `app-layout.tsx` |
| Template placeholders | `__UPPER_SNAKE__` | `__APP_NAME__` |
| Plan fields | camelCase | `remoteUrl`, `moduleOptions` |
| Generated files | Begin with a comment saying they are generated and how to change them | `src/main/ipc/router.ts` |

## Code standards

1. **TypeScript strict mode** everywhere, with `noUncheckedIndexedAccess`.
   No `any` in new code; validate external data at the boundary.
2. **Biome** for linting and formatting (2-space indent, 120-character lines,
   sorted imports). `bun run verify` fails on any finding.
3. **Every IPC input is validated** (Zod on Electron, typed arguments and
   explicit checks on Tauri). The interface is untrusted.
4. **Errors carry a readable message** for the person using the app; logs carry
   the detail. On Tauri every fallible command returns `AppResult`.
5. **No secrets in source, configuration or plans.** Runtime credentials use the
   OS key store; build credentials use environment variables.
6. **Each file starts with a comment** stating its responsibility, and public
   functions explain what they do and why when the reason is not obvious.
7. **Tests live next to the code** (`*.test.ts`) for units and in `tests/e2e`
   for end-to-end flows. Every module ships tests for its logic.
8. **Database migrations are append-only**, numbered, and each runs in a transaction.
9. **Dependencies are added deliberately.** A module lists exactly the packages
   it needs; templates pin major versions with `^` and lock files pin exact versions.

## Repository layout of a module

A module folder mirrors the layout of the app it is copied into. On Electron:
`src/main/modules/<id>/index.ts` (exports `mainModule`), optional
`src/renderer/features/<id>/index.tsx` (exports `feature`), tests beside the
code and optional `tests/e2e/<id>.spec.ts`. On Tauri:
`src-tauri/src/modules/<snake_id>.rs` (exports `register`, optional `setup`
and commands), optional `src-tauri/capabilities/<id>.json`, optional
`src/features/<id>/` (panel and command wrappers) and optional
`tests/e2e/<id>.e2e.ts`.

## Writing documentation

Documentation in this repository is written for a reader who has not seen any
earlier work: every term is defined on first use, every list and table is
introduced by a sentence, and commands are given exactly as they are typed.
Links are included only to pages that were opened and checked.
