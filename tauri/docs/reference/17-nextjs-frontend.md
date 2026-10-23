# Using Next.js as the Tauri Frontend

Source pages:
- https://github.com/tauri-apps/tauri-docs (git clone, commit `11934e365dfea50ef116f51cb7e26742554a34c6`), files under `src/content/docs/`:
  - `start/frontend/nextjs.mdx` (https://v2.tauri.app/start/frontend/nextjs/)
  - `start/frontend/index.mdx` (https://v2.tauri.app/start/frontend/)
  - `develop/index.mdx` (https://v2.tauri.app/develop/): `TAURI_DEV_HOST` and the mobile dev server
  - `security/csp.mdx` (https://v2.tauri.app/security/csp/)
- https://github.com/vercel/next.js (docs folder only, commit `7657545d157a04c3b21112f08e4675a4ebffeb5a`), files under `docs/`:
  - `01-app/02-guides/static-exports.mdx` (Static Exports guide)
  - `01-app/03-api-reference/05-config/01-next-config-js/allowedDevOrigins.mdx`, `assetPrefix.mdx`, `trailingSlash.mdx`
  - `01-app/03-api-reference/02-components/image.mdx` (`unoptimized`)
  - `01-app/03-api-reference/04-functions/generate-static-params.mdx`
  - `01-app/03-api-reference/03-file-conventions/proxy.mdx` (the renamed middleware)
  - `01-app/03-api-reference/06-cli/next.mdx` (`next dev` options)
  - `01-app/01-getting-started/01-installation.mdx` (minimum Node.js version)
  - `01-app/02-guides/upgrading/version-16.mdx` (removal of `next lint`)
- `tauri` 2.12.5 crate source, `src/manager/mod.rs` (how the built app resolves page paths)
- https://github.com/tauri-apps/tauri (sparse clone, commit `8d3efdeea5b4221301a4fc5e2d4ab969abe8aa7f`), `crates/tauri-cli/CHANGELOG.md` (Android `adb reverse` port forwarding)
- `npm view next version`, `npm view next engines`, `npm view react version`, `npm view @tauri-apps/api version` (run 2026-10-22)
- A test project built in this session with Bun, Next.js 16.4.2, React 19.3.1 and `@tauri-apps/api` 2.12.4 **(tested)**: static build, a dynamic-route failure, the dev server's asset URLs, and the dev server's cross-origin blocking

Verified on 2026-10-22

## What this page covers

**Next.js** is a React framework that adds file-based routing, server rendering and build-time page generation. A Tauri app has no web server at runtime: the project structure page says Tauri "works similar to a static web host", embedding the frontend's built files in the binary. Next.js can still be used, but only in its **static export** mode, in which `next build` writes plain HTML, CSS and JavaScript files to a folder. This page gives the exact settings for that, lists which Next.js features cannot work in a Tauri app, shows how to call Tauri APIs safely from Next.js components, and explains the extra settings needed when the app runs on a phone during development.

The terms below are used throughout:

- **SSR** (server-side rendering) means generating HTML on a server for each request. **SSG** (static site generation) means generating HTML once at build time. Tauri's frontend checklist says to use SSG, a single-page app (SPA) or a classic multi-page app, and that Tauri "does not natively support server based alternatives (such as SSR)".
- **App Router** is Next.js's `app/` directory routing; **Pages Router** is the older `pages/` directory routing. Both support static export with different feature lists.
- **Server Component** is a React component that runs only on the server or, in a static export, only at build time. **Client Component** is one marked with `'use client'` that also runs in the browser (here, the Tauri web view).
- **Dev server** is the process `next dev` starts, which serves pages with live reload during development.

## 1. Versions

The versions below were read from the npm registry on 2026-10-22.

| Package | Version | Note |
| --- | --- | --- |
| `next` | 16.4.2 | `latest` tag; `next dev` and `next build` use the Turbopack bundler by default |
| `react`, `react-dom` | 19.3.1 | |
| `@tauri-apps/api` | 2.12.4 | must share the minor version of the `tauri` crate (`16-architecture-and-project-files.md`) |
| Node.js required by `next` | `>=20.9.0` | from `npm view next engines`; the installation page also says 20.9 |

The Tauri Next.js guide says it "is accurate as of Next.js 14.2.3". Its settings were applied unchanged to Next.js 16.4.2 in this session, and a static build succeeded with Bun **(tested)**.

## 2. Required settings

### 2.1 `next.config.mjs`

The Tauri guide gives this configuration. The `allowedDevOrigins` line is an addition explained in section 5; everything else is the guide's text.

```js
// next.config.mjs
const isProd = process.env.NODE_ENV === 'production';

const internalHost = process.env.TAURI_DEV_HOST || 'localhost';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure Next.js uses SSG instead of SSR
  output: 'export',
  // Required to use the Next.js Image component in SSG mode.
  images: {
    unoptimized: true,
  },
  // Configure assetPrefix or else the server won't properly resolve your assets.
  assetPrefix: isProd ? undefined : `http://${internalHost}:3000`,
  // Added (section 5): let a phone on the network load dev assets.
  allowedDevOrigins: process.env.TAURI_DEV_HOST ? [process.env.TAURI_DEV_HOST] : [],
};

export default nextConfig;
```

Each key does the following:

- **`output: 'export'`** turns on static export. Next.js's guide says `next build` then creates an `out` folder with the HTML, CSS and JavaScript, one HTML file per route. In the test, `next build` produced `out/index.html`, `out/about.html`, `out/404.html` and `out/_next/static/...` **(tested)**.
- **`images.unoptimized: true`** turns off Next.js's image optimization, which needs a server. Next.js's static export guide lists "Image Optimization with the default `loader`" as unsupported; the alternative it gives is a custom loader (`images: { loader: 'custom', loaderFile: './my-loader.ts' }`) that points at an external image service.
- **`assetPrefix`** makes the dev server write absolute URLs for its JavaScript and CSS files (`/_next/static/...`). In development it is `http://<TAURI_DEV_HOST or localhost>:3000`, and in production it is unset so the built files use root-relative paths that Tauri serves. With `TAURI_DEV_HOST=192.168.1.50`, the dev page's script tags pointed to `http://192.168.1.50:3000/_next/static/chunks/...` **(tested)**.

The optional static-export settings in Next.js's guide are listed below; none is required for Tauri.

- `trailingSlash: true` writes `/about/index.html` instead of `/about.html`. Either layout works in Tauri, because the `tauri` 2.12.5 asset resolver tries the path, then `<path>.html`, then `<path>/index.html`, then falls back to `index.html`.
- `skipTrailingSlashRedirect: true` keeps links exactly as written.
- `distDir: 'dist'` changes the output folder from `out` to `dist`. If used, `frontendDist` must change to `"../dist"`.

### 2.2 `src-tauri/tauri.conf.json`

The Tauri guide's `build` section is shown below in its Bun form first and npm form second. The guide shows npm, yarn, pnpm and deno; the Bun form follows the same pattern as the rest of this set.

```json
{
  "build": {
    "beforeDevCommand": "bun run dev",
    "beforeBuildCommand": "bun run build",
    "devUrl": "http://localhost:3000",
    "frontendDist": "../out"
  }
}
```

```json
{
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devUrl": "http://localhost:3000",
    "frontendDist": "../out"
  }
}
```

`devUrl` must match the Next.js dev server port, which is 3000 by default (`next dev -p` changes it). `frontendDist` is relative to `src-tauri`, so `../out` is the project root's `out` folder. If the port changes, change it in `devUrl` and in `assetPrefix` together.

### 2.3 `package.json` scripts

The Tauri guide's scripts are:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "tauri": "tauri"
  }
}
```

`dev` and `build` are the ones Tauri calls. `start` runs Next.js's production server, which a Tauri app does not use. **Drop the `lint` script on Next.js 16**: the Next.js 16 upgrade guide (`01-app/02-guides/upgrading/version-16.mdx`) says "The `next lint` command has been removed. Use Biome or ESLint directly. `next build` no longer runs linting." The builder's apps already lint with Biome. The minimal scripts for Next.js 16 are therefore `"dev": "next dev"`, `"build": "next build"` and `"tauri": "tauri"`.

Then run the app as usual (any OS):

```sh
bun run tauri dev
```

```sh
npm run tauri dev
```

## 3. Next.js features that do not work in a Tauri app

Because the built app has no Next.js server, anything that needs a server at request time is unavailable. Next.js's static export guide lists these as unsupported for the App Router, and says that using them with `next dev` produces an error, as if the root layout set `export const dynamic = 'error'`. The list is reproduced below.

1. Dynamic routes with `dynamicParams: true`.
2. Dynamic routes without `generateStaticParams()`.
3. Route handlers that rely on the `Request`.
4. Cookies (the `cookies()` function).
5. Rewrites, redirects and headers configured in `next.config`.
6. Proxy, the file convention formerly called middleware (Next.js's proxy page says "The `middleware` file convention is deprecated and has been renamed to `proxy`").
7. Incremental Static Regeneration (ISR), which rebuilds pages on a server after deployment.
8. Image optimization with the default loader.
9. Draft Mode.
10. Server Actions (functions marked `'use server'` that run on the server when called).
11. Intercepting routes.

For the Pages Router the guide's list is: internationalized routing, API routes, rewrites, redirects, headers, proxy, ISR, image optimization with the default loader, Draft Mode, `getStaticPaths` with `fallback: true` or `fallback: 'blocking'`, and `getServerSideProps`.

The guide also lists what does work, as follows.

- **Server Components** run once during `next build`, and their output becomes static HTML. A `fetch` inside one therefore runs on the build machine, not in the user's app; data that must be current or private must be fetched in a Client Component at runtime.
- **Client Components** work normally, and route changes with `next/link` happen in the client like a single-page app.
- **Route handlers** work only for `GET` and must be marked `export const dynamic = 'force-static'`; they become static files at build time (for example `app/data.json/route.ts` becomes `data.json`).
- **Dynamic routes** work only when `generateStaticParams()` returns every parameter at build time. A dynamic page without it failed the build with `Page "/post/[id]" is missing "generateStaticParams()" so it cannot be used with "output: export" config.` **(tested)**. For values only known at runtime, such as a database record's ID, a static route that reads a query parameter or client state is the usual approach (this is a design suggestion, not from either guide).

Where a feature needs the backend, the Tauri equivalent is a Rust command called with `invoke` (see `05-ipc.md`) or a plugin. For example, form submissions that would use a Server Action call a Tauri command instead, and data that would come from a route handler comes from a command or the SQL plugin.

## 4. Calling Tauri APIs from Next.js components

Next.js prerenders every page, including Client Components, in Node.js during `next build`. Next.js's guide warns that browser APIs such as `window`, `localStorage` and `navigator` "are not available on the server", so they must be used only in the browser, for example inside `useEffect`. Tauri's JavaScript API depends on the web view, so the same rule applies to it.

The behaviour of `@tauri-apps/api` 2.12.4 outside a web view was checked in Node.js **(tested)**:

- Importing `@tauri-apps/api/core`, `event`, `window`, `webviewWindow` and `path` at the top of a module succeeded, so imports are safe in prerendered code.
- Calling `invoke(...)` threw `window is not defined`, so calls must not run during rendering.
- `isTauri()` from `@tauri-apps/api/core` returned `false`, so it can guard calls (it reads a global flag that Tauri sets in its web view).

The resulting rules are listed below.

1. Put every Tauri API call in a file that starts with `'use client'`.
2. Call Tauri APIs only in `useEffect` or in event handlers (such as `onClick`), never in the component body or in a Server Component.
3. Guard calls with `isTauri()` where the page may also render outside Tauri, such as during the build or when the page is opened in a normal browser.
4. Clean up event listeners when the component unmounts.

The component below follows these rules and was compiled into a static export in the test **(tested)**:

```tsx
// app/greeting.tsx
'use client';

import { useEffect, useState } from 'react';
import { invoke, isTauri } from '@tauri-apps/api/core';

export default function Greeting() {
  const [message, setMessage] = useState('not running in Tauri');

  useEffect(() => {
    if (!isTauri()) return;
    invoke<string>('greet', { name: 'Next' })
      .then(setMessage)
      .catch((error) => setMessage(String(error)));
  }, []);

  return <p>{message}</p>;
}
```

A Server Component page can include it, because only the Client Component touches Tauri:

```tsx
// app/page.tsx
import Greeting from './greeting';

export default function Page() {
  return (
    <main>
      <h1>Home</h1>
      <Greeting />
    </main>
  );
}
```

For events, the Tauri docs' React pattern registers the listener in `useEffect` and removes it in the cleanup function. `listen` returns a Promise of the `unlisten` function, so the cleanup awaits it:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';

export function DownloadTracker() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const unlisten = listen<number>('download-progress', (event) => setProgress(event.payload));
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  return <div>Download progress: {progress}%</div>;
}
```

Alternatives that keep Tauri code out of the server bundle entirely are a dynamic `import('@tauri-apps/api/core')` inside `useEffect`, or `next/dynamic` with `ssr: false`. Neither is required, given the import test above, and neither is described in the Tauri guide.

## 5. Running on a phone during development

During `tauri android dev` or `tauri ios dev`, the app on the device loads pages from the Next.js dev server on the host (see `14-mobile.md`, section 5). Three settings work together for this, as described below.

1. **The dev server must be reachable on the network.** Next.js's CLI reference gives `next dev`'s default hostname as `0.0.0.0` (all network interfaces), so no flag is needed; `-H <hostname>` overrides it.
2. **Asset URLs must use the address the device can reach.** The Tauri CLI sets `TAURI_DEV_HOST` for physical iOS devices and when `--host` is passed. The guide's `assetPrefix` then points all `/_next/static/...` URLs at that address, as shown in the test in section 2.1.
3. **Next.js must accept requests from that address.** Next.js's `allowedDevOrigins` page says the dev server blocks cross-origin requests to dev-only assets and endpoints by default, and allows only `localhost`, its subdomains and the hostname it was started with. In the test, a request for a dev JavaScript chunk carrying `Origin: http://192.168.1.50:3000` was rejected with HTTP 403, and the dev server's log printed the fix: `allowedDevOrigins: ['192.168.1.50']` **(tested)**. A plain same-origin script request without an `Origin` header was served (200), so whether a real device hits this block depends on how its requests are made. Adding `TAURI_DEV_HOST` to `allowedDevOrigins`, as in section 2.1, covers it. The Tauri guide does not mention this setting. It was tested only with simulated requests, not on a real device, so it is **UNVERIFIED** on hardware.

Run on a physical iPhone through Xcode (macOS), or use the network address on Android:

```sh
bun run tauri ios dev --open --host
bun run tauri android dev --host
```

```sh
npm run tauri ios dev -- --open --host
npm run tauri android dev -- --host
```

On the Android emulator and on USB-connected Android phones, the Tauri CLI forwards the port with `adb reverse` (CLI changelog), so `localhost:3000` normally works without `--host`.

## 6. Content Security Policy with Next.js

The Tauri CSP page says that at compile time Tauri "appends its nonces and hashes to the relevant CSP attributes automatically to bundled code and assets". A **CSP** (Content Security Policy) is a list of allowed content sources that the web view enforces. The exported `out/index.html` from Next.js 16.4.2 contains three inline `<script>` elements as well as external chunk scripts **(tested)**, so a strict policy such as the builder's `default-src 'self'` relies on Tauri hashing those inline scripts. Whether a Next.js export runs unchanged under the builder's CSP in `tauri build` was not run in this session (**UNVERIFIED**). Test the built app before shipping, and if scripts are blocked, check the web view console (see `08-testing-debugging.md`).

## 7. Checklist for a Next.js Tauri frontend

The ordered list below is the minimum an agent should check when generating or reviewing a Next.js frontend for Tauri.

1. `next.config.mjs` has `output: 'export'`, `images.unoptimized: true` (or a custom loader), the `assetPrefix` from TAURI_DEV_HOST for development, and `allowedDevOrigins` including `TAURI_DEV_HOST` when set.
2. `tauri.conf.json` has `devUrl: "http://localhost:3000"`, `frontendDist: "../out"`, `beforeDevCommand: "bun run dev"` and `beforeBuildCommand: "bun run build"`.
3. No Server Actions, request-dependent route handlers, `cookies()` or other request-time functions, proxy (middleware), ISR, `next.config` rewrites/redirects/headers, or dynamic routes without `generateStaticParams()`.
4. Every Tauri API call is in a `'use client'` file, inside `useEffect` or an event handler, guarded by `isTauri()` where needed, with listeners cleaned up.
5. `bun run build` succeeds and writes `out/index.html` before `bun run tauri build` is attempted.

## Facts that could not be verified here

The items below are marked **UNVERIFIED** in the text.

- Whether the `allowedDevOrigins` block affects a real iOS or Android device (tested only with simulated HTTP headers).
- Whether a Next.js static export runs under the builder's strict CSP in a built Tauri app.
