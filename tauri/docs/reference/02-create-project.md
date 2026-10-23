# Creating a Project

Source pages:
- https://github.com/tauri-apps/tauri-docs/blob/b62e441c3522fb9ffb01a92898071bac9463d6f7/src/content/docs/start/create-project.mdx
- https://github.com/tauri-apps/tauri-docs/blob/b62e441c3522fb9ffb01a92898071bac9463d6f7/src/content/docs/_fragments/cta.mdx
- https://github.com/tauri-apps/tauri-docs/blob/b62e441c3522fb9ffb01a92898071bac9463d6f7/src/content/docs/start/project-structure.mdx
- https://github.com/tauri-apps/tauri-docs/blob/b62e441c3522fb9ffb01a92898071bac9463d6f7/src/content/docs/start/frontend/vite.mdx
- https://github.com/tauri-apps/create-tauri-app/blob/379add21351259c03d3a61fa44aea62485b50cc9/README.md
- https://github.com/tauri-apps/create-tauri-app/blob/379add21351259c03d3a61fa44aea62485b50cc9/src/args.rs
- https://github.com/tauri-apps/create-tauri-app/tree/379add21351259c03d3a61fa44aea62485b50cc9/templates (`_base_` and `template-react-ts`)
- https://v2.tauri.app/reference/cli/ (fetched; `init`, `build`, `icon`, `info` options)

Verified on 2026-10-21

## Two ways to start

There are two supported ways to get a Tauri project. The first is `create-tauri-app`, a scaffolding tool that generates a complete project from an official template. The second is to take an existing web frontend and add Tauri to it with the Tauri CLI's `init` command. Both produce the same `src-tauri/` folder layout, which is described after the two procedures.

## Option A: `create-tauri-app`

### Interactive use

The docs list one launcher per package manager. For Bun the docs page shows:

```sh
bun create tauri-app
```

while the `create-tauri-app` README shows `bunx create-tauri-app`. Both were observed to run the same tool. The interactive prompts ask, in order, for the project name, the bundle identifier (a reverse-domain unique ID such as `com.example.myapp`), the frontend language family (Rust, TypeScript/JavaScript, or .NET), the package manager (pnpm, yarn, npm, bun, plus deno in the template code), the UI template, and the UI flavor (TypeScript or JavaScript).

### Non-interactive use (for agents)

`create-tauri-app` accepts command-line options that skip the prompts. The options, taken from the tool's own `--help` output (version 4.8.0) and `src/args.rs`, are:

| Option | Meaning |
| --- | --- |
| `[PROJECTNAME]` (positional) | Directory name, also used for `package.json` and `Cargo.toml`. `.` scaffolds into the current directory. |
| `-m`, `--manager <MANAGER>` | Package manager: `cargo`, `pnpm`, `yarn`, `npm`, `deno`, `bun`, `dotnet` |
| `-t`, `--template <TEMPLATE>` | Template: `vanilla`, `vanilla-ts`, `vue`, `vue-ts`, `svelte`, `svelte-ts`, `react`, `react-ts`, `solid`, `solid-ts`, `yew`, `leptos`, `sycamore`, `angular`, `preact`, `preact-ts`, `blazor`, `dioxus` |
| `--identifier <ID>` | Bundle identifier |
| `-y`, `--yes` | Skip prompts and use defaults where applicable |
| `-f`, `--force` | Create even if the target directory is not empty |
| `--tauri-version [1 \| 2]` | Tauri major version; defaults to the latest stable (2) |

The React + TypeScript + Vite project with Bun, fully non-interactive, is **(tested)**:

```sh
bun create tauri-app my-app --template react-ts --manager bun --identifier com.example.myapp --yes
cd my-app
bun install
bun run tauri dev
```

An important observation from testing: under `bun create`, the short flag `-y` was rejected with `Error: Invalid Argument '-y'`, while the long flag `--yes` worked. Agents should therefore use `--yes`. (The cause was not investigated; it may be Bun consuming the short flag.)

The README's non-interactive example for npm 7 and later needs an extra `--` before the options (`npm create tauri-app@latest my-tauri-app -- --template svelte`); Bun did not need it in testing.

After scaffolding, the tool printed `bun install` and `bun run tauri dev` as the next steps, plus `bun run tauri android init` / `bun run tauri android dev` for Android.

### What the React + TypeScript template contains

The `react-ts` template, rendered with Bun, produced the following (inspected on disk):

- `package.json` with scripts `dev: vite`, `build: tsc && vite build`, `preview: vite preview`, `tauri: tauri`; dependencies `react`, `react-dom`, `@tauri-apps/api` (`^2`), `@tauri-apps/plugin-opener` (`^2`); dev dependencies `@vitejs/plugin-react`, `typescript`, `vite`, `@tauri-apps/cli` (`^2`).
- `vite.config.ts` set up for Tauri: `clearScreen: false` so Rust errors are not hidden, a fixed dev port **1420** with `strictPort: true` (Tauri expects a fixed port), `host` taken from the `TAURI_DEV_HOST` environment variable (used for iOS physical devices), HMR on port 1421 when that host is set, and `server.watch.ignored: ["**/src-tauri/**"]` so Vite does not rebuild when Rust files change.
- `src/App.tsx` calling `invoke("greet", { name })` from `@tauri-apps/api/core`.
- `src-tauri/tauri.conf.json` with `beforeDevCommand: "bun run dev"`, `devUrl: "http://localhost:1420"`, `beforeBuildCommand: "bun run build"`, `frontendDist: "../dist"`, one 800x600 window, `security.csp: null`, `bundle.active: true`, `bundle.targets: "all"`, and five icon paths.
- `src-tauri/capabilities/default.json` granting `core:default` and `opener:default` to the window labelled `main`.
- `src-tauri/src/lib.rs` with a `greet` command, the opener plugin, and `invoke_handler(tauri::generate_handler![greet])`.
- `src-tauri/Cargo.toml` with edition 2024, a `[lib]` section named `<package>_lib` (for example `my_app_lib`) with `crate-type = ["staticlib", "cdylib", "rlib"]`, dependencies `tauri = "2"`, `tauri-plugin-opener = "2"`, `serde`, `serde_json`, build dependency `tauri-build = "2"`, and a size-optimized `[profile.release]` (`codegen-units = 1`, `lto = true`, `opt-level = 3`, `panic = "abort"`, `strip = true`).

Note that the general Vite guide in the docs uses port **5173** (Vite's default) while the template uses **1420**. Whatever port is chosen, `devUrl` in `tauri.conf.json` and `server.port` in `vite.config.ts` must agree.

## Option B: add Tauri to an existing frontend (`tauri init`)

When a web frontend already exists, the docs describe this sequence (Bun forms shown):

1. Have a frontend that can be served in a browser, for example `bun create vite`.
2. Install the CLI as a dev dependency: `bun add -D @tauri-apps/cli@latest`.
3. Find the dev server URL (Vite's default is `http://localhost:5173`).
4. Run `bun tauri init`. It prompts for the app name, window title, web assets location (relative to `src-tauri`), dev server URL, frontend dev command and frontend build command, then creates `src-tauri/`.
5. For Vite, add `server.watch.ignored: ["**/src-tauri/**"]` to `vite.config.ts`.
6. Run `bun tauri dev` to verify.

For an agent, `tauri init` can be run without prompts. The CLI reference lists these options: `--ci` (skip prompts; also triggered by `CI=true`), `-f`/`--force` (overwrite `src-tauri`), `-d`/`--directory`, `-t`/`--tauri-path`, `-A`/`--app-name`, `-W`/`--window-title`, `-D`/`--frontend-dist` (relative to `src-tauri`), `-P`/`--dev-url`, `--before-dev-command`, `--before-build-command`. A combined example built from those documented options (the combination itself was not executed, so treat as **UNVERIFIED**):

```sh
bun tauri init --ci -A my-app -W "My App" -D ../dist -P http://localhost:5173 \
  --before-dev-command "bun run dev" --before-build-command "bun run build"
```

`init` does not set the bundle identifier from a flag listed on the CLI page, so check `identifier` in the generated `tauri.conf.json` and change it from any placeholder: the config reference states that `tauri build` rejects the default identifier `com.tauri.dev`.

## Project layout

The docs describe a typical project like this:

```
.
├── package.json
├── index.html
├── src/                  # frontend source
├── src-tauri/            # Rust project (a normal Cargo project)
│   ├── Cargo.toml
│   ├── Cargo.lock
│   ├── build.rs          # calls tauri_build::build()
│   ├── tauri.conf.json   # main Tauri config; also the marker the CLI uses to find the Rust project
│   ├── src/
│   │   ├── main.rs       # desktop entry point; just calls <lib_name>::run()
│   │   └── lib.rs        # your Rust code and the mobile entry point
│   ├── icons/            # output of `tauri icon`, referenced by bundle.icon
│   └── capabilities/
│       └── default.json  # permissions granted to windows
```

The purpose of each part, per the project structure page:

- `tauri.conf.json` holds identity, build hooks, windows, security and bundle settings (see `03-config.md`).
- `capabilities/` is the default folder from which capability files are read. A command must be allowed here before the frontend can call it (see `04-security-capabilities.md`).
- `icons/` is where `tauri icon` writes its output.
- `build.rs` contains `tauri_build::build()`, which drives Tauri's build-time code generation.
- `src/lib.rs` holds the app code. It contains the function marked `#[cfg_attr(mobile, tauri::mobile_entry_point)]`, because mobile builds compile the app as a library. The docs advise leaving `main.rs` alone and editing `lib.rs`. The name called from `main.rs` is the `[lib] name` in `Cargo.toml`.
- After the first build, `src-tauri/gen/schemas/` contains generated JSON schemas (for example `desktop-schema.json`) that the capability files reference with `$schema`. This folder was observed on disk after `cargo check` **(tested)**.

The docs explain the build model this way: Tauri behaves like a static web host. The frontend is first compiled to static files, and the Rust project is then compiled with those files embedded.

## Everyday commands (Bun)

These are the CLI invocations an agent will use most. The docs write the Bun form as `bun tauri <cmd>`; the generated project prints `bun run tauri <cmd>`. Both run the `tauri` script.

| Task | Command |
| --- | --- |
| Run in development (starts `beforeDevCommand`, compiles Rust, opens a window) | `bun run tauri dev` |
| Production build and bundle | `bun run tauri build` |
| Debug build (devtools enabled, output under `src-tauri/target/debug/bundle`) | `bun run tauri build --debug` |
| Build only specific bundle formats | `bun run tauri build --bundles <list>` |
| Compile without bundling | `bun run tauri build --no-bundle` |
| Merge an extra config file | `bun run tauri build --config src-tauri/tauri.beta.conf.json` |
| Add an official plugin | `bun run tauri add <plugin>` |
| Generate all icons from one square PNG/SVG (default input `./app-icon.png`) | `bun run tauri icon [path]` |
| Show environment information | `bun run tauri info` (the CLI page lists an `--interactive` option for applying automatic fixes; what `info` prints is not described on that page) |
| Print CLI version | `bun run tauri --version` (printed `tauri-cli 2.12.4` here) |

Other `build` options listed on the CLI reference: `-t`/`--target <triple>` (including `universal-apple-darwin`), `-r`/`--runner <binary>` (defaults to `cargo`), `-f`/`--features`, `--ci`, `--no-sign`, `--skip-stapling` (macOS), `--ignore-version-mismatches`, `--no-binary-patching`, `-v`/`--verbose`.
