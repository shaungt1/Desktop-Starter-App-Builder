# Quick start

This page takes you from a fresh checkout to a running desktop app by hand,
without an AI agent. Each step names the command and what to expect. Run the
commands from the builder's root folder in Bash (macOS, Linux, Git Bash or WSL
on Windows, the recommended shell); in PowerShell, replace `bash start.sh` with `.\start.ps1`.

## 0. Decide which base you need

Answer these questions first; the table maps the answers to a base. The full
reasoning is in [`docs/CHOOSING_A_BASE.md`](docs/CHOOSING_A_BASE.md).

| If your answer is | Choose |
| --- | --- |
| A quick proof of concept, or a small product, and installer size and memory matter | **Tauri** |
| The app must also run on Android or iOS | **Tauri** (targets `android` and `ios`) |
| A large product that will keep growing, with a big team, many integrations, or Node.js libraries and native Node modules | **Electron** |
| Identical rendering on every operating system matters more than size | **Electron** |
| You are unsure | Start with **Tauri** for a prototype, and read `docs/CHOOSING_A_BASE.md` before committing to a larger build |

This is a non-binding recommendation; either base can build most apps.

## 1. Prepare and check the machine

The bootstrap scripts look at what is installed, print a plan of what is
missing, ask, and then install only that. Add `--dry-run` to see the plan
without changing anything, and `--mobile` to include the Android tools (and the
iOS tools on a Mac).

```bash
# Windows (Git Bash), macOS or Linux: the script detects which one it is on
bash start.sh bootstrap --base tauri --dry-run
bash start.sh bootstrap --base tauri
```

On Windows it installs with winget (the Windows package manager); the Visual
Studio Build Tools installer shows a Windows permission prompt that you must
accept. PowerShell users can run `scripts\bootstrap.ps1` instead.

Then check the result. `doctor` never installs anything:

```bash
bun install
bash start.sh doctor --base electron
bash start.sh doctor --base tauri
```

Each line reads `ok`, `missing` or `too old` with the exact fix. Electron needs
Bun, Node.js 22.17+ and Git. Tauri needs Bun, Git, Rust 1.90+ and the platform
pieces listed in [`docs/SETUP_RESOURCES.md`](docs/SETUP_RESOURCES.md), which
also gives every manual installation step per operating system.

## 2. Choose a base, profile and interface

Run `bash start.sh list` to see the decision rule. In short: choose
**Electron** when the native side needs Node libraries, a local database,
background processes or identical rendering everywhere; choose **Tauri** when
small installers matter and the native side is light or you will write it in
Rust. Then choose what the window shows: the bundled interface (`native`), a
web app you already host (`remote`), or, on Electron, a static web export
bundled for offline use (`exported`). For the native profile, choose the
frontend (`vite` or `nextjs`) and the interface kit (`shadcn`, or `konsta` with
the `ios` or `material` look); [`docs/CHOOSING_A_BASE.md`](docs/CHOOSING_A_BASE.md)
explains each.

## 3. Write the plan

Copy the example closest to what you want and edit it:

```bash
cp plans/examples/electron-native.json ../acme-plan.json
```

Change `name`, `slug` (lowercase with hyphens), `appId` (reverse DNS such as
`com.acme.notes`) and `description`. Add modules from
`bash start.sh module list --base electron`, for example
`"modules": ["database", "filesystem"]`. Then validate it:

```bash
bash start.sh plan check ../acme-plan.json
```

The output is the plan with every default filled in and every required module
added. Alternatively, `bash start.sh plan new --out ../acme-plan.json` asks for
each value in the terminal.

## 4. Generate, install and verify

```bash
bash start.sh create ../acme-notes --plan ../acme-plan.json --install --verify
```

The destination can be a relative path (as above) or a full path such as
`C:/Users/me/Projects/acme-notes`. To skip the plan file, `new` builds the plan
from flags and creates the app in one command:

```bash
bash start.sh new ../acme-notes --name "Acme Notes" --base electron --frontend nextjs --ui konsta --ui-theme ios --modules database --install --verify
```

Modules with required options take them as repeated `--option module.option=value`
flags, for example
`--modules auth-oidc --option auth-oidc.issuer=https://id.example.com --option auth-oidc.clientId=desktop-app`.

The target must be outside the builder, and either missing or containing only
files a fresh GitHub repository has (`.git`, `README.md`, `LICENSE`,
`.gitignore`). A new Git repository is initialized unless one exists; no
remote is added and nothing is committed. `--verify` runs the app's quality
gate; it must end with `verification passed`. The new folder is a complete,
independent project: open it in its own editor window, and use its
`README.md`, `AGENTS.md` and `docs/README.md` from here on.

## 5. Run it

```bash
cd ../acme-notes
bun run dev
```

Electron opens the window with hot reload. Tauri compiles the Rust core first
(the first build takes longest), then opens the window.

## 6. Test end to end and build installers

From the app folder:

```bash
bun run test:e2e      # Linux without a display: xvfb-run -a bun run test:e2e
```

Then, from the builder:

```bash
bash start.sh release ../acme-notes
```

`release` runs the quality gate and builds installers for the current
operating system. Signing and publishing are covered in
[`docs/RELEASE_AND_SIGNING.md`](docs/RELEASE_AND_SIGNING.md).

## 7. Add a module later

```bash
bash start.sh module add auth-oidc ../acme-notes \
  --option issuer=https://your-tenant.example.com --option clientId=your-client-id
```

The builder adds the module and anything it requires, updates the generated
registry files, installs packages, re-runs verification and prints the steps
you must complete outside the code (for sign-in, registering the redirect URI
at your identity provider).
