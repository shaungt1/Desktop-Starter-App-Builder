# Prompt: set up a new Electron app

**Purpose.** Have an agent create a complete Electron desktop app with this
builder: it collects the missing decisions, writes and validates a plan, waits
for your approval, generates the app, proves it works and reports back.

**Best used when** the app needs Node libraries, a local database, background
work, identical rendering on every OS, or wraps a hosted web app with native
features. If small installers matter more, use `tauri/prompts/setup-tauri-app.md`.

**How to use.** Open the builder folder in your editor, start your agent there,
fill in the brackets below (leave any you are unsure of as "ask me") and paste it.

```text
Read AGENT_START.md and follow its required sequence exactly to create a new
Electron desktop app with this builder.

App name: [display name]
Slug: [lowercase-with-hyphens, or "derive it"]
App id: [reverse DNS, e.g. com.company.app]
Description: [one line]
Author: [name or company]
What the window shows: [native | remote: <https URL of the hosted app> | exported (static export bundled for offline use)]
Modules I think I need: [e.g. database, secure-storage, auth-oidc, auto-update, filesystem, background, crash-reporting — or "recommend"]
Sign-in provider (if auth-oidc): [issuer URL and public client id, or "ask me"]
Updates (if auto-update): [github with repository owner/name | static with base URL]
Brand colors: [CSS colors, or "use defaults"]
Target folder: [absolute path outside this repository]

Rules: run `bash start.sh doctor --base electron` first and stop if a required
tool is missing. Show me the resolved plan from `plan check` and wait for my
approval before running `create`. After generating, run `setup` and `verify`,
then the app's `bun run test:e2e` (use `xvfb-run -a` on Linux without a
display). Do not publish, sign or push anything. Finish with the hand-off
report described in AGENT_START.md, including every module's manual steps.
```
