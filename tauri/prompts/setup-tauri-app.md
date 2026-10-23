# Prompt: set up a new Tauri app

**Purpose.** Have an agent create a complete Tauri 2 desktop app with this
builder: it collects the missing decisions, writes and validates a plan, waits
for your approval, generates the app, proves it works and reports back.

**Best used when** installer size and memory matter, the app is a thin client
over an API or a focused utility, the native side is light or worth writing in
Rust, or iOS and Android from the same code are a goal. If the native side
needs npm libraries or Node, use `electron/prompts/setup-electron-app.md`.

**How to use.** Open the builder folder in your editor, start your agent there,
fill in the brackets below (leave any you are unsure of as "ask me") and paste it.

```text
Read AGENT_START.md and follow its required sequence exactly to create a new
Tauri 2 desktop app with this builder. For Tauri specifics, use
tauri/docs/AGENT_REFERENCE.md and tauri/docs/reference/.

App name: [display name]
Slug: [lowercase-with-hyphens, or "derive it"]
App id: [reverse DNS, e.g. com.company.app]
Description: [one line]
Author: [name or company]
What the window shows: [native | remote: <https URL of the hosted app>]
Modules I think I need: [e.g. database, secure-storage, auth-oidc, auto-update, filesystem, background — or "recommend"]
Sign-in provider (if auth-oidc): [issuer URL and public client id, or "ask me"]
Updates (if auto-update): [manifest URL and public key, or "set up later"]
Brand colors: [CSS colors, or "use defaults"]
Target folder: [absolute path outside this repository]

Rules: run `bash start.sh doctor --base tauri` first; if Rust, the C++ build
tools, WebView2 (Windows) or the WebKitGTK packages (Linux) are missing, stop
and give me the exact install commands. Show me the resolved plan from
`plan check` and wait for my approval before `create`. After generating, run
`setup` and `verify` (the first Rust build is slow; let it finish). Run the
app's `bun run test:e2e` if tauri-driver is installed (Linux: xvfb-run -a),
otherwise say it was not run. Do not publish, sign or push anything. Finish
with the hand-off report described in AGENT_START.md, including every module's
manual steps.
```
