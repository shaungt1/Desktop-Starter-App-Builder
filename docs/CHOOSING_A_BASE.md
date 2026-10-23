# Choosing a base and a profile

A generated app makes two decisions that are expensive to reverse. The
**base** is the desktop framework: Electron or Tauri 2. The **profile** is
where the window's content comes from. This document explains what each
option is, what it is best used for, and the rule that decides between them,
so that a person or an agent can make and justify the choice.

A third base, the **browser extension**, is not a desktop framework at all: it
is for products that live inside the browser. It is covered in its own section
below, and the first question to ask is whether the product needs a window of
its own at all.

## Why the base matters

Both desktop bases show a web interface inside a native window, and in both the
interface is the same React code from `shared/`. They differ in what sits
underneath. Electron ships a complete Chromium browser and a Node.js runtime
inside every app; the native side is TypeScript and can use any npm package.
Tauri ships neither; it uses the web view the operating system already has
(WebView2 on Windows, WKWebView on macOS, WebKitGTK on Linux), and the native
side is a compiled Rust program. The comparison below summarizes the
consequences.

| Property | Electron | Tauri 2 |
| --- | --- | --- |
| Native-side language | TypeScript on Node.js | Rust |
| Rendering engine | Bundled Chromium, identical on every OS | The OS web view, which differs per OS and OS version |
| Installer size | Roughly a 100 MB floor | Single-digit to tens of MB |
| Memory at idle | Higher (a browser per app) | Lower |
| Reusing npm libraries on the native side | Any package, including native add-ons | Not possible without a separate sidecar process |
| Reaching native capabilities | Direct, from TypeScript | Rust code or official plugins, each granted in a capability file |
| Default security posture | Hardened by configuration (isolation, sandbox, fuses) | Deny-by-default permissions |
| Mobile (iOS, Android) from the same code | No | Yes, though younger and with thinner plugin coverage |
| Packaging tool in this builder | Electron Forge | Tauri CLI bundler |
| End-to-end testing | Playwright on all three desktop OSes | WebDriver via tauri-driver on Windows and Linux |

The browser extension base is not in this table because it does not compare
with the desktop bases on these rows; see the next section.

## First question: desktop app or browser extension

Before comparing Electron and Tauri, decide whether the product is a desktop
application or a browser extension. A **browser extension** is a small program
that the user adds to Chrome, Edge or Firefox. It can read and change the web
pages the user visits, add a toolbar button, a side panel or a right-click menu
item, and react to browsing activity. It runs inside the browser, so it has no
window of its own, no access to files outside the browser's sandbox, and no
code running while the browser is closed.

1. **Choose the browser extension** when the product is something the user does
   *while browsing*: highlighting or clipping page content, adding a panel to a
   site they already use, blocking or rewriting page content, or a companion to
   a web product. One codebase ships to the Chrome Web Store, Microsoft Edge
   Add-ons and Firefox Add-ons. There is no installer and no code-signing
   certificate, so it is also the quickest base for a proof of concept.
2. **Choose a desktop app** (Electron or Tauri) when the product needs its own
   window, files or devices on the user's computer, work that continues when
   the browser is closed, or a native look and system tray presence.

The browser extension base uses WXT (an extension build framework), React,
Tailwind CSS and TypeScript, and has one profile. Its modules are `side-panel`,
`context-menu` and `content-ui`. Its limits are the browser's: an extension
must request every permission it uses and is reviewed by each store, must
bundle all the code it runs, and cannot keep state in memory because the
browser stops its background worker when idle.

## The short answer: product size

Most choices come down to how large and long-lived the app will be. This
repository's default guidance is the following, and an agent should ask about
the app's scope and size before applying the detailed rule below.

1. **Electron for apps that will grow into large products.** Electron has the
   biggest ecosystem and the most mature tooling for complex integrations
   (vendor SDKs on npm, local databases, background jobs, enterprise sign-in,
   crash reporting, update servers), renders identically on every operating
   system, and lets a TypeScript team work on both sides without learning Rust.
   It suits the final, enterprise-grade version of a product that many people
   will extend for years. The cost is size: every installer carries a browser.
2. **Tauri for lean, fast apps and proofs of concept, and for mobile.** Tauri
   starts small (installers of a few megabytes, low memory), builds quickly
   once Rust has compiled the first time, and is the only base here that also
   targets Android and iOS from the same project. It suits a proof of concept,
   an internal tool, a thin client over an API, or a product where size and
   speed are requirements. Tauri apps are also used in production; the
   trade-off is that native-side work is written in Rust and Node libraries
   cannot run inside the app.

When the scope answers point in different directions, the decision rule below
settles it.

## Decision rule

The builder's catalog encodes this rule (`bash start.sh list` prints it).

**Choose Electron** when any of the following is true:

1. The native side needs Node libraries or native Node modules (for example a
   peer-to-peer transport, a document parser, a vendor SDK published to npm).
2. The app needs a background process, a local database or a long-running
   agent loop written in TypeScript.
3. The interface must render the same on every operating system, or depends on
   Chromium-only behavior.
4. The team works in TypeScript end to end and does not want to maintain Rust.

**Choose Tauri** when any of the following is true and none of the Electron
reasons applies:

1. The app is a thin client over a remote API, or does most of its work in the
   interface.
2. Installer size or memory use is a stated requirement.
3. The team is willing to write native-side logic in Rust, or shipping iOS and
   Android from the same code is a real goal.

When nothing above decides it, Electron is the builder's default because more
native work is possible without learning a second language.

## Tauri: purpose and best use

Tauri's purpose is to deliver a desktop app with the footprint of a native
program while keeping a web interface. Its best uses are utilities and
companion apps (menu-bar tools, clients for an existing web service, small
editors and viewers) where download size, start-up time and memory matter, and
where the native work is either light or worth writing in Rust for its speed
and safety. Its permission model is also a strength for apps that will be
security-reviewed: every file, network or shell capability the interface uses
is listed in a capability file that a reviewer can read. Its weaker fits are
apps whose native logic already exists as npm packages, and interfaces that
rely on behavior only Chromium has, because the Linux and macOS web views lag
behind Chromium.

## Electron: purpose and best use

Electron's purpose is to let a web team ship a full desktop application with
the whole Node.js ecosystem on the native side. Its best uses are products
whose desktop client does real work locally: file synchronization, local
databases and search indexes, background agents, device integrations through
npm SDKs, and apps that wrap or extend an existing web product with native
features such as tray presence, deep links and auto-update. The cost is
installer size and memory, which rarely matter for productivity software but
do matter for small utilities.

## Profiles: where the window's content comes from

The profile is chosen once per app because it sets the build pipeline, the
sign-in path and the update story. The decision depends on whether a hosted web
app already exists and whether the desktop app must work offline.

| Question | Answer | Profile |
| --- | --- | --- |
| Is there a hosted web app to reuse? | No | `native` |
| Is there a hosted web app to reuse? | Yes, and the desktop app must work offline | `exported` (Electron only) |
| Is there a hosted web app to reuse? | Yes, and a network connection is acceptable | `remote` |

**`native`** shows the bundled React interface from `shared/` and the base
template. It works offline, and every screen is built in this app. This is the
default and the right choice when there is no web counterpart.

**`remote`** opens a web app you already host (for example a Next.js app with
server components, route handlers and middleware intact) inside the desktop
window. Screens are reused completely and stay in sync with the web release.
The desktop layer adds native capabilities, deep links, tray and updates.
It requires a network connection; Electron shows a bundled offline screen when
the site cannot load. On Electron the hosted site may call native procedures
only because its origin is listed as trusted; on Tauri it may call nothing
until a capability file grants its URL specific permissions.

**`exported`** (Electron only) bundles a static export of a web app, such as
`next build` with `output: "export"`, and serves it from a private `app://`
scheme so it works offline. A static export loses server features: server
components, route handlers, middleware, server actions and image optimization
must move to an API or disappear. Tauri can do the same by pointing
`frontendDist` at the export folder, which is documented rather than generated.

## Frontend, interface kit, package manager and targets

Four smaller choices sit on top of the base. Each is a plan field, and each can
be changed later by hand (or by generating a fresh app and moving code across).

1. **Frontend** (`frontend`). `vite` builds the interface as a single-page
   React app with Vite and TanStack Router; it is the default because it is
   the simplest and fastest. `nextjs` builds it with the Next.js App Router
   and exports every route to static files at build time (`output: "export"`).
   Choose it when the team already works in Next.js or wants file-based
   routing. Next.js server features (server actions, route handlers,
   middleware, image optimization, incremental regeneration) do not exist in a
   desktop app because there is no server; calls go to the native side or to a
   remote API instead. To wrap an existing hosted Next.js site, use the
   `remote` profile; to bundle an existing static export, use the Electron
   `exported` profile.
2. **Interface kit** (`ui`, `uiTheme`). `shadcn` gives accessible, restylable
   components with a desktop look. `konsta` gives components that reproduce
   native iOS or Material Design (Android) navigation bars, tab bars, lists and
   controls, chosen with `uiTheme`. Both install Motion (animations and screen
   transitions, switched off when the operating system asks for reduced motion)
   and @use-gesture (touch and drag gestures). [`UI_KITS.md`](UI_KITS.md)
   compares every other kit.
3. **Package manager** (`packageManager`). `bun` (default) or `npm`. Both work
   on Windows, macOS and Linux; the official Tauri documentation shows Bun
   commands for desktop and mobile on every host. `npm` is offered for teams
   that standardize on it.
4. **Targets** (`targets`, Tauri only). `desktop` is always built; `android`
   and `ios` add mobile scripts and require the native profile and
   mobile-capable modules. iOS apps can only be built on a Mac.

## Changing the decision later

Switching profiles in an existing app means replacing `src/main/content.ts`
(Electron) or adjusting `src-tauri/src/window.rs` (Tauri) and the
`profile` field in `app.config.json`. Switching bases means generating a new app
and moving screens across; the interface code in `src/renderer` (Electron) and
`src` (Tauri) is largely the same, but native code must be rewritten. Choosing
deliberately at the start avoids that cost.
