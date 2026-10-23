# Prompt: set up a new browser extension

**Purpose.** Have an agent create a complete browser extension (Chrome, Edge and
Firefox) with this builder: it collects the missing decisions, writes and validates a
plan, waits for your approval, generates the project, proves it works in a real
browser and reports back.

**Best used when** the product lives inside the browser: it changes or reads web
pages, adds a toolbar button, side panel or right-click action, or reacts to browsing.
An extension needs no installer and no code-signing certificate, which makes it the
quickest base for a proof of concept. If the product needs a window of its own or
files outside the browser, use the Electron or Tauri prompt instead.

**How to use.** Open the builder folder in your editor, start your agent there, fill
in the brackets (leave any you are unsure of as "ask me") and paste it.

```text
Read AGENT_START.md and follow its required sequence exactly to create a new
browser extension with this builder (base: extension).

Extension name: [display name shown in the browser]
Slug: [lowercase-with-hyphens, or "derive it"]
App id: [reverse DNS, e.g. com.company.clipper; used for the Firefox add-on id]
Description: [one line; this is shown in the store]
Author: [name or company]
What it does: [the one thing it does for the user]
Sites it works on: [match patterns such as https://example.com/*, or "ask me"; keep them narrow]
Modules I think I need: [side-panel, context-menu, content-ui — or "recommend"]
Brand colors: [CSS colors, or "use defaults"]
Package manager: [bun | npm]
Target folder: [absolute path outside this repository]

Rules: run `bash start.sh doctor --base extension` first and stop if a required tool
is missing. Ask for the smallest set of browser permissions that works, and tell me
each one you add and why. Show me the resolved plan from `plan check` and wait for my
approval before running `create`. After generating, run `setup` and `verify`, then
the extension's `bun run test:e2e`, and `bun run build` and `bun run build:firefox`.
Do not publish, submit to a store, sign or push anything. Finish with the hand-off
report described in AGENT_START.md, including the store accounts I will need.
```
