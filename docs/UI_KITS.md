# Interface kits, animation and gesture libraries

Source pages:
- https://github.com/konstaui/konsta (git clone at `/home/claude/src/konsta`, commit `5b8e54d35ba7ace274cca450f808af570d258f57`, committed 2026-10-15): `README.md`, `CHANGELOG.md`, `src/types/App.d.ts`, `src/theme.css`, `src/react/theme.css`, `src/styles/*.css`, `src/plugin-colors.js`, `kitchen-sink/react/` (`index.html`, `vite.config.js`, `styles/index.css`, `components/App.jsx`)
- The published `konsta@5.5.0` tarball from the npm registry (`npm pack konsta@5.5.0`): `package.json`, `react/theme.css`, `theme.css`, `styles/base.css`, `styles/colors.css`, `styles/ios-material.css`, `styles/safe-areas.css`, `react/components/App.js`, `react/shared/KonstaProvider.js`, `react/shared/use-auto-theme.js`
- https://github.com/tauri-apps/tauri-docs (git clone, commit `11934e365dfe`): `src/content/docs/concept/process-model.md` and `src/content/docs/develop/Plugins/develop-mobile.mdx`
- The Desktop Starter App Builder repository: `config/catalog.json` (`uiKits`), `cli/lib/plan.ts`, `electron/template/package.json`, `tauri/template/package.json`, `shared/renderer/styles/globals.css`
- The npm registry, through `npm view <package> version license peerDependencies peerDependenciesMeta dependencies dist-tags time`, for every version, license, peer range and publish date in this file
- Pages fetched and read: https://konstaui.com/react/installation, https://konstaui.com/react/usage, https://konstaui.com/react/app, https://konstaui.com/react/safe-areas, https://konstaui.com/react/theme-variants, https://ui.shadcn.com/docs/installation/vite, https://ui.shadcn.com/docs/changelog, https://ui.shadcn.com/docs/changelog/2025-02-tailwind-v4, https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default, https://ui.shadcn.com/docs/changelog/2026-07-react-aria, https://ui.shadcn.com/docs/changelog/2026-07-toast, https://ui.shadcn.com/docs/components/base/drawer, https://base-ui.com/react/overview/quick-start, https://ionicframework.com/docs/theming/platform-styles, https://ionicframework.com/docs/developing/config, https://ionicframework.com/docs/utilities/gestures, https://ionicframework.com/docs/react/overview, https://framework7.io/react/, https://framework7.io/react/app, https://framework7.io/docs/introduction, https://framework7.io/docs/app, https://heroui.com/docs/react/getting-started/quick-start, https://mantine.dev/getting-started/, https://mui.com/material-ui/getting-started/, https://mui.com/material-ui/getting-started/installation/, https://mui.com/material-ui/integrations/tailwindcss/tailwindcss-v4/, https://chakra-ui.com/docs/get-started/installation, https://www.radix-ui.com/themes/docs/overview/getting-started, https://ark-ui.com/docs/overview/introduction, https://park-ui.com/, https://daisyui.com/docs/install/, https://storybooks.fluentui.dev/react/, https://tamagui.dev/docs/intro/introduction, https://react-aria.adobe.com/, https://react-aria.adobe.com/getting-started, https://onsen.io/, https://github.com/OnsenUI/OnsenUI, https://mobile.ant.design/, https://github.com/material-components/material-web, https://motion.dev/docs/react, https://motion.dev/docs/react-drag, https://use-gesture.netlify.app/docs/, https://use-gesture.netlify.app/docs/gestures/, https://use-gesture.netlify.app/docs/state/, https://use-gesture.netlify.app/docs/options/, https://www.react-spring.dev/docs/getting-started, https://auto-animate.formkit.com/, https://gsap.com/standard-license, https://github.com/Gamote/lottie-react, https://github.com/emilkowalski/vaul, https://sonner.emilkowal.ski/, https://www.embla-carousel.com/, https://dndkit.com/, https://swiperjs.com/react
- README text served by the npm registry (`npm view <package> readme`) for `@fluentui/react-components`, `@heroui/react`, `@lottiefiles/dotlottie-react` and `@dnd-kit/react`

Verified on 2026-10-22

## Purpose and scope

This document surveys the React libraries that can give a generated app the look and feel of a current App Store or Play Store app: component kits (ready-made buttons, lists, navigation bars, sheets and similar building blocks), animation libraries, and gesture libraries. It lists every option that was examined and states facts about each one; it does not rank them, and the choice is left to the reader. After the survey it gives the exact, tested setup for the two kits the builder offers (shadcn/ui and Konsta UI) and for the two motion libraries the builder preinstalls (Motion and @use-gesture/react).

Several terms recur throughout, so they are defined here once.

- A **web view** is a browser engine embedded in a native app window. Electron ships its own copy of the Chromium engine. Tauri uses the engine the operating system provides: Microsoft Edge WebView2 on Windows, WKWebView on macOS and WebKitGTK on Linux (Tauri docs, `concept/process-model.md`). On mobile, Tauri's plugin guide shows iOS plugins receiving a `WKWebView` and Android plugins receiving an `android.webkit.WebView` (`develop/Plugins/develop-mobile.mdx`). Every library in this document runs inside these web views because each one is ordinary React code rendered as HTML and CSS.
- **React** is the user-interface library the generated apps use. **React 19** is its current major version; the builder's templates pin `react` at `^19.3.1`.
- A **peer dependency** is a package that a library expects the app to install itself, together with the range of versions the library declares it supports. In this document, "React 19 compatible (declared)" means the library's `peerDependencies` range on npm includes React 19. A library that declares no React peer range is marked "not declared".
- **Tailwind CSS** is a styling system in which components are styled with small utility class names such as `p-4` or `bg-primary`. Version 4 is configured from the CSS file (with `@import "tailwindcss";` and `@theme { ... }` blocks) instead of a JavaScript configuration file. The builder's templates use `tailwindcss` `^4.3.3` with the `@tailwindcss/vite` plugin.
- A **headless** or **unstyled** library provides behavior (keyboard handling, focus management, accessibility attributes, open and closed state) but no visual design; the app supplies the styles. Such building blocks are often called **primitives**.
- A **provider** is a React component placed near the root of the app that passes shared settings (such as the theme) to every component below it.
- **iOS style** means components drawn to resemble Apple's iPhone and iPad interface. **Material** means Google's Material Design, the visual language of Android. A **touch ripple** is the expanding circle Material Design draws where a finger touches a control.
- A **safe area** is the part of a phone screen not covered by the notch, the status bar or the home indicator. Web pages read its size from the CSS function `env(safe-area-inset-top)` and its siblings, which only report non-zero values when the page's viewport meta tag contains `viewport-fit=cover`.
- A **gesture** is a touch or pointer movement with a meaning, such as a drag, a swipe, a pinch or a long press. A **spring animation** moves a value as if it were attached to a physical spring, which is how native mobile interfaces animate.

## How the facts were collected

Every version, license, peer range and publish date below comes from the npm registry on 2026-10-22. "Last publish" is the publish time of the version tagged `latest`, read from `npm view <package> "time[<version>]"`; it is not the registry's `time.modified` field, which can change without a new release. Descriptive facts (what a kit is, which styles it offers) come from the project's own documentation page or README listed under "Source pages". Bundle sizes are stated only where a source states them; no source read for this survey gives a numeric size. Where a fact could not be checked, it is marked **UNVERIFIED**.

The Konsta UI, Motion and @use-gesture/react setups were also tested: a Vite app with `react@19.3.1`, `react-dom@19`, `konsta@5.5.0`, `motion@14.6.0`, `@use-gesture/react@10.3.1`, `tailwindcss@4`, `@tailwindcss/vite@4`, `vite@8.3.5` and `@vitejs/plugin-react@6` was type-checked with TypeScript in strict mode, built with `vite build`, and server-rendered with `react-dom/server` on Linux. These results are marked **(tested)**. Gestures were not exercised on a touch device, because no browser or device was available.

## Comparison of component kits

The table below compares the component kits on the properties the builder cares about: the package to install, its current version and last publish date, its license, whether its declared peer range includes React 19, how it relates to Tailwind CSS 4, and whether it offers iOS-style or Material-style components. A dash in the Tailwind column means the kit does not use Tailwind CSS. Each row is explained in its own section after the table.

| Kit | npm package | Version | Last publish | License | React 19 (declared) | Tailwind CSS 4 | iOS style | Material style |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| shadcn/ui | `shadcn` (command-line tool) | 4.22.1 | 2026-10-18 | MIT | Components updated for React 19 (changelog) | Yes (changelog, Feb 2025) | No | No |
| Radix Primitives | `radix-ui` | 1.8.1 | 2026-10-12 | MIT | Yes (`^16.8` to `^19.0`) | Unstyled; works with any styling | No | No |
| Base UI | `@base-ui/react` | 1.9.0 | 2026-10-09 | MIT | Yes (`^17 \|\| ^18 \|\| ^19`) | Unstyled; works with any styling | No | No |
| Konsta UI | `konsta` | 5.5.0 | 2026-09-28 | MIT | Not declared; React 19 API since 5.0.0 (tested with 19.3.1) | Required (v4 API since 5.0.0) | Yes | Yes |
| Ionic React | `@ionic/react` | 9.0.9 | 2026-10-21 | MIT | Yes (`^18 \|\| ^19`) | - | Yes (`ios` mode) | Yes (`md` mode) |
| Framework7 React | `framework7-react` + `framework7` | 9.2.0 | 2026-09-28 | MIT | Not declared | - | Yes | Yes |
| HeroUI (formerly NextUI) | `@heroui/react` | 3.2.6 | 2026-09-17 | MIT | Yes (`>=19.0.0`, required) | Required (`tailwindcss >=4.0.0`) | No | No |
| Mantine | `@mantine/core` | 9.7.3 | 2026-10-17 | MIT | Yes (`^19.2.0`, required) | - | No | No |
| MUI (Material UI) | `@mui/material` | 9.5.0 | 2026-10-09 | MIT | Yes (`^17 \|\| ^18 \|\| ^19`) | - (documented interop) | No | Yes (Material Design 2) |
| Chakra UI | `@chakra-ui/react` | 3.37.0 | 2026-08-28 | MIT | Yes (`>=18`) | - | No | No |
| Radix Themes | `@radix-ui/themes` | 3.3.0 | 2026-01-31 | MIT | Yes (`16.8` to `^19.0`) | - | No | No |
| Ark UI | `@ark-ui/react` | 5.39.3 | 2026-10-05 | MIT | Yes (`>=18.0.0`) | Unstyled; works with any styling | No | No |
| Park UI | `@park-ui/panda-preset` | 0.43.1 | 2024-11-22 | MIT | Not applicable (styling preset) | - (uses Panda CSS) | No | No |
| daisyUI | `daisyui` | 5.7.50 | 2026-10-13 | MIT | Not applicable (CSS only) | Required (Tailwind plugin) | No | No |
| Fluent UI React v9 | `@fluentui/react-components` | 9.74.11 | 2026-10-22 | MIT | Yes (`>=16.14.0 <20.0.0`) | - | No | No |
| Tamagui | `tamagui` | 3.1.2 | 2026-10-21 | MIT | Yes (`>=19`, required) | - | Not described | Not described |
| React Aria Components | `react-aria-components` | 1.22.1 | 2026-10-09 | Apache-2.0 | Yes (`^16.8.0` to `^19.0.0-rc.1`) | Unstyled; Tailwind examples provided | No | No |
| Onsen UI | `react-onsenui` + `onsenui` | 1.13.3 / 2.12.9 | 2023-06-20 / 2026-06-16 | Apache-2.0 | No (`^18.0.0` only) | - | Yes | Yes |
| Ant Design Mobile | `antd-mobile` | 5.43.0 | 2026-09-14 | MIT | Yes (`^16.8.0` to `^19.0.0`) | - | Not described | Not described |
| React Vant | `react-vant` | 3.3.5 | 2024-05-15 | MIT | Yes (`>=16.14.0`) | - | Not described | Not described |
| NutUI React | `@nutui/nutui-react` | 4.0.0-beta.9 (tag `latest`) | 2026-10-14 | MIT | No (`^16.8.0 \|\| ^17.0.0 \|\| ^18.0.0`) | - | Not described | Not described |
| Zarm | `zarm` | 3.4.2 | 2026-07-15 | MIT | Yes (`^16.8.0` to `^19.0.0`) | - | Not described | Not described |
| Material Web | `@material/web` | 2.5.0 | 2026-07-15 | Apache-2.0 | Not applicable (web components) | - | No | Yes (Material 3) |
| mdui | `mdui` | 2.1.5 | 2026-07-14 | MIT | Not applicable (web components) | - | No | Yes (Material You, per npm description) |

Taken together, the table shows that only a small group of kits draws platform-specific iOS and Material components (Konsta UI, Ionic React, Framework7 React and Onsen UI), while the others provide one design that is the same on every platform, or no design at all.

## Component kits in detail

Each subsection below states what the kit is, how it is installed, its compatibility facts, its touch and gesture support, and its maintenance signals. Install commands work on any operating system (Windows, macOS or Linux) from the generated app's folder; the Bun command is given first and the npm command second.

### shadcn/ui

shadcn/ui is not a dependency in the usual sense. Its command-line tool, the npm package `shadcn` (version 4.22.1, published 2026-10-18, MIT), copies the source code of each component into the app, where it can be edited freely. The components are styled with Tailwind CSS and built on a primitive library chosen when the project is initialized. The shadcn/ui changelog entry of July 2026 ("Base UI as the Default") states that new projects use Base UI by default, that Radix remains supported, and that `shadcn init -b radix` selects Radix. A separate July 2026 entry states that React Aria is "now a first-class component base", selected with `shadcn@latest init --base aria`, and that existing projects stay on their current base. The February 2025 entry states: "All components are updated for Tailwind v4 and React 19."

For touch, the Drawer component page states that "The drawer component now uses Base UI instead of Vaul", and the July 2026 Toast entry states that a new Toast component for Base UI projects "supports actions, status types, promises, stacking, and swipe dismissal". None of the shadcn/ui pages read for this survey describe iOS-style or Material-style themes.

The builder's generated apps already contain shadcn-style components built on the `radix-ui` package (`radix-ui` `^1.8.1` in both template `package.json` files), so this kit needs no installation step. The Vite installation page shows the command-line tool used as `pnpm dlx shadcn@latest add button`; with Bun or npm the equivalent forms are:

```sh
bunx shadcn@latest add button
npx shadcn@latest add button
```

### Radix Primitives and Base UI (the shadcn/ui foundations)

Radix Primitives is a set of unstyled, accessible React primitives. The single package `radix-ui` (1.8.1, published 2026-10-12, MIT) declares the peer range `^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc`; per-component packages such as `@radix-ui/react-dialog` (1.3.1) declare the same range. The shadcn/ui changelog lists a "Unified Radix UI Package" entry in February 2026; only its title was readable.

Base UI is an unstyled component library published as `@base-ui/react` (1.9.0, published 2026-10-09, MIT), with the peer range `^17 || ^18 || ^19` and two optional peers, `date-fns` and `@date-fns/tz`. Its quick-start page says that, because it is unstyled, "you can use CSS-in-JS, plain CSS, or any other styling solution", shows Tailwind and CSS Modules examples, and says the package is tree-shakable (unused components are removed from the production bundle). The earlier package name `@base-ui-components/react` is deprecated on npm with the message "Package was renamed to @base-ui/react".

```sh
bun add @base-ui/react
npm install @base-ui/react
```

### Konsta UI

Konsta UI is a set of mobile components built with Tailwind CSS that reproduce the iOS and Material Design look; its README describes it as "Pixel perfect mobile UI components built with Tailwind CSS with iOS and Material Design components for React, Vue & Svelte". The package is `konsta` (5.5.0, published 2026-09-28, MIT). It declares no peer dependencies and one dependency, `tailwind-merge` `^3.3.1`. The 5.0.0 changelog entry (2025-08-19) states that the release brings an "updated iOS 26 and Material Design 2025 look and feel", that Konsta "has been updated to the latest Tailwind v4 API", and that "All components have been updated to the latest React 19 API" (including "update to use react `ref` prop"). A React 19.3.1 app using Konsta 5.5.0 type-checks, builds and server-renders **(tested)**. Whether Konsta 5 works with React 18 is **UNVERIFIED**.

The component list in the published package includes App, Page, Navbar, Toolbar, Tabbar, List and ListItem, ListInput, Card, Button, Segmented, Searchbar, Sheet, Popup, Panel, Popover, Dialog, Actions, Notification, Toast, Toggle, Checkbox, Radio, Range, Stepper, Chip, Badge, Fab, Messages and Messagebar, Preloader, Progressbar, Table and Glass. For touch feedback, the App component enables a touch ripple in the Material theme (`materialTouchRipple`) and a touch highlight in the iOS theme (`iosHoverHighlight`). The sources read do not describe swipe or drag gestures for Konsta components; that is the role of the gesture libraries below. The full setup is in "Konsta UI integration".

### Ionic React

Ionic React (`@ionic/react`, 9.0.9, published 2026-10-21, MIT, peer range `^18 || ^19`) brings the Ionic Framework's component library to React. Ionic draws components in one of two **modes**. Its platform-styles page states that iPhone, iPad and iPod use the `ios` mode, Android uses the `md` (Material Design) mode, and any other platform uses `md`; the mode is added as a class on the `<html>` element and can be overridden in the global configuration. The configuration page shows the React form:

```tsx
setupIonicReact({
  mode: 'md',
});
```

For gestures, the configuration option `swipeBackEnabled` enables the "swipe-to-go-back" gesture, and the Gestures utility (`createGesture`) builds custom gestures; that page says the utility does not require an Ionic app, and that its `passive` option defaults to `true`. The Ionic React overview names Capacitor (`@capacitor/core`, 8.5.3) as Ionic's official cross-platform runtime. How Ionic detects the platform when it runs inside a Tauri web view, rather than inside Capacitor, is **UNVERIFIED**; setting `mode` explicitly, as shown above, does not depend on that detection. Ionic is not Tailwind-based.

```sh
bun add @ionic/react
npm install @ionic/react
```

### Framework7 React

Framework7 is described on its introduction page as "a free and open source mobile HTML framework" that is "focused only on iOS and Google Material design". Its React binding is `framework7-react` (9.2.0, published 2026-09-28, MIT), used together with the core package `framework7` (9.2.0). Neither package declares a React peer range, so React 19 compatibility is not declared and is **UNVERIFIED**. The App parameters page lists `theme` (`ios`, `md` or `auto`, default `auto`, where `auto` "will use iOS theme for iOS devices and MD theme for all other devices"), `darkMode` (`true`, `false` or `auto`), `tapHold`, `touchRipple` ("for Material theme only (v9+)") and `touchHighlight` ("for iOS theme (v9+)"). The React page lists components named Swipeout, Swiper and Pull To Refresh. Framework7 is not Tailwind-based. The exact React installation lines were not on the pages read and are **UNVERIFIED**.

### HeroUI (formerly NextUI)

HeroUI's npm README describes it as "HeroUI (previously NextUI)", a React component library combining React Aria (for accessibility) with Tailwind CSS v4, and states that it "requires no `<Provider>` wrapper". The package `@heroui/react` (3.2.6, published 2026-09-17, MIT) declares `react >=19.0.0`, `tailwindcss >=4.0.0`, `react-aria-components ^1.21.1` and several other React Aria packages as peers. The quick-start page installs two packages and requires the stylesheet order "Always import `tailwindcss` first":

```sh
bun add @heroui/styles @heroui/react
npm install @heroui/styles @heroui/react
```

The exact CSS import line for `@heroui/styles` was not quoted on the page read and is **UNVERIFIED**. No iOS or Material themes are described.

### Mantine

Mantine (`@mantine/core`, 9.7.3, published 2026-10-17, MIT) declares `react ^19.2.0`, `react-dom ^19.2.0` and `@mantine/hooks 9.7.3` as peers. Its getting-started page imports styles with `import '@mantine/core/styles.css';`, recommends the PostCSS plugins `postcss-preset-mantine` and `postcss-simple-vars`, and wraps the app in `MantineProvider`. The page does not mention Tailwind CSS, touch support or platform themes.

```sh
bun add @mantine/core @mantine/hooks
npm install @mantine/core @mantine/hooks
```

### MUI (Material UI)

MUI's `@mui/material` (9.5.0, published 2026-10-09, MIT) declares React `^17.0.0 || ^18.0.0 || ^19.0.0`; its styling packages `@emotion/react` and `@emotion/styled` are optional peers on npm but appear in the documented install command. The getting-started page states "Material UI supports Material Design 2", so it provides the Android (Material) look and no iOS look. It uses Emotion, a CSS-in-JavaScript library, as its default styling engine. Its Tailwind CSS v4 integration page explains how to let Tailwind classes override MUI styles in a Vite app: wrap the app in `<StyledEngineProvider enableCssLayer>` and render `<GlobalStyles styles="@layer theme, base, mui, components, utilities;" />`.

```sh
bun add @mui/material @emotion/react @emotion/styled
npm install @mui/material @emotion/react @emotion/styled
```

### Chakra UI

Chakra UI (`@chakra-ui/react`, 3.37.0, published 2026-08-28, MIT) declares `react >=18`, `react-dom >=18` and `@emotion/react >=11` as peers, and its npm dependency list includes `@ark-ui/react` 5.39.0. The installation page requires Node.js 20.x or later and wraps the app in a generated `Provider` component that combines `ChakraProvider` with `next-themes` for color mode. The page does not mention Tailwind CSS or platform themes.

```sh
bun add @chakra-ui/react @emotion/react
npm install @chakra-ui/react @emotion/react
```

### Radix Themes

Radix Themes is a styled component library from the Radix project. The package `@radix-ui/themes` (3.3.0, MIT) declares React `16.8` through `^19.0`; its latest version was published on 2026-01-31, the oldest last-publish date among the actively released styled kits in this survey. The getting-started page imports `@radix-ui/themes/styles.css` and wraps the root in a `Theme` component with props such as `accentColor`, `grayColor`, `radius` and `scaling`. Tailwind compatibility and platform themes are not described.

```sh
bun add @radix-ui/themes
npm install @radix-ui/themes
```

### Ark UI and Park UI

Ark UI (`@ark-ui/react`, 5.39.3, published 2026-10-05, MIT, peer `react >=18.0.0`) is described on npm as "A collection of unstyled, accessible UI components for React, utilizing state machines", and its introduction page says the components "are shipped without styles". Chakra UI 3 depends on it, as noted above.

Park UI is a styled layer on top of Ark UI. Its site describes "Beautifully designed components built with Ark UI and Panda CSS" for React and Solid; Panda CSS is a separate styling system, and the site does not mention Tailwind CSS. The site links to the `chakra-ui/park-ui` repository and announces "Park UI × Chakra — It's official!". The npm package `@park-ui/panda-preset` (0.43.1, MIT, peer `@pandacss/dev >0.22.0`) was last published on 2024-11-22. How Park UI components are added to a project was not described on the page read and is **UNVERIFIED**.

### daisyUI

daisyUI (`daisyui`, 5.7.50, published 2026-10-13, MIT) is a Tailwind CSS plugin that adds component class names (for example a button class) rather than React components, so it declares no React peer range and works with any framework. Its install page uses Tailwind CSS 4 directly:

```sh
bun add -d daisyui@latest
npm install -D daisyui@latest
```

```css
@import "tailwindcss";
@plugin "daisyui";
```

No iOS or Material themes are described, and the page does not say whether daisyUI ships JavaScript.

### Fluent UI React v9

Fluent UI React v9 is published as `@fluentui/react-components` (9.74.11, published 2026-10-22, MIT, peer React `>=16.14.0 <20.0.0`). Its npm README calls it a suite of "converged" components resulting from a dedupe of `@fluentui/react` and `@fluentui/react-northstar`, and shows the app wrapped in a `FluentProvider` with a theme such as `teamsLightTheme`. No iOS or Material themes are described. It is not Tailwind-based.

```sh
bun add @fluentui/react-components
npm install @fluentui/react-components
```

### Tamagui

Tamagui supports the web as well as React Native: its introduction page states that "All features work consistently across React Native and web" and that its optional optimizing compiler extracts style properties "into atomic CSS". The package `tamagui` (3.1.2, published 2026-10-21, MIT) declares `react >=19` and an optional peer `react-native-safe-area-context`. The introduction page does not describe iOS-style or Material-style themes. It is not Tailwind-based. The exact Vite setup for a web-only Tamagui app was not read and is **UNVERIFIED**.

### React Aria Components

React Aria Components (`react-aria-components`, 1.22.1, published 2026-10-09, Apache-2.0, peer React `^16.8.0` through `^19.0.0-rc.1`) is an unstyled library from Adobe's React Spectrum project. Its getting-started page says it "does not include any styles by default" and can be styled with "vanilla CSS, Tailwind CSS, CSS-in-JS, etc.". Its home page describes touch behavior in detail: "dragging off to cancel a press, long pressing to select", hover states that apply only to a mouse ("no sticky touch hover states"), focus rings that appear only during keyboard use, and behaviors that "work without a keyboard". It is also one of the three primitive bases of shadcn/ui (`--base aria`).

```sh
bun add react-aria-components
npm install react-aria-components
```

### Onsen UI

Onsen UI's site states that its components offer "iOS and Android Material design support, with automatic styling". The React binding `react-onsenui` is at 1.13.3, published on 2023-06-20, and declares `react ^18.0.0`, `react-dom ^18.0.0` and `onsenui ~2.12.8` as peers, so React 19 is outside its declared range. The core package `onsenui` is at 2.12.9, published on 2026-06-16. Both are Apache-2.0. Neither the site nor the repository page read for this survey states a maintenance status, and the repository page showed no release list; whether the project is maintained is therefore **UNVERIFIED**, and the facts above are the available signals.

### Other kits that target a mobile look

The following kits were found while searching for libraries that explicitly target mobile interfaces. They are listed with the facts that were checked; their visual style was not described on the pages read.

1. **Ant Design Mobile** (`antd-mobile`, 5.43.0, published 2026-09-14, MIT, peer React `^16.8.0` through `^19.0.0`). Its site describes "Essential UI blocks for building mobile web apps".
2. **React Vant** (`react-vant`, 3.3.5, published 2024-05-15, MIT, peer `react >=16.14.0`). Its npm description is "React Mobile UI Components base on Vant UI".
3. **NutUI React** (`@nutui/nutui-react`). The npm `latest` tag points to the pre-release 4.0.0-beta.9 (published 2026-10-14, MIT), whose peer range `^16.8.0 || ^17.0.0 || ^18.0.0` excludes React 19. Its npm description, translated from Chinese, says it is a lightweight mobile React component library in the JD.com style that produces both mobile web pages and mini-programs from one codebase.
4. **Zarm** (`zarm`, 3.4.2, published 2026-07-15, MIT, peer React `^16.8.0` through `^19.0.0`). Its npm description, translated from Chinese, is "a React-based mobile UI library".
5. **Material Web** (`@material/web`, 2.5.0, published 2026-07-15, Apache-2.0). These are web components (custom HTML elements that work in any framework) implementing Material 3. Its README states: "MWC is in maintenance mode pending new maintainers." The README gives no React guidance.
6. **mdui** (`mdui`, 2.1.5, published 2026-07-14, MIT). Its npm description, translated from Chinese, is "a Web Components component library implementing the Material You design specification".

This completes the survey of component kits; the next section covers the libraries that add motion and gestures to whichever kit is chosen.

## Comparison of animation, gesture and interaction libraries

The table below lists the animation, gesture and interaction libraries in the same way: package, version, last publish date, license, the declared React peer range, and what the library does. Each row is explained in its own section after the table.

| Library | npm package | Version | Last publish | License | React peer range | Role |
| --- | --- | --- | --- | --- | --- | --- |
| Motion (formerly Framer Motion) | `motion` | 14.6.0 | 2026-10-22 | MIT | `^18.0.0 \|\| ^19.0.0` | Animation, layout animation, exit animation, drag, hover and tap gestures |
| @use-gesture | `@use-gesture/react` | 10.3.1 | 2024-03-21 | MIT | `>= 16.8.0` | Gesture recognition: drag, pinch, scroll, wheel, move, hover |
| react-spring | `@react-spring/web` | 10.1.2 | 2026-06-24 | MIT | `^16.8.0` to `^19.0.0` | Spring animation |
| AutoAnimate | `@formkit/auto-animate` | 0.10.0 | 2026-07-10 | MIT | Not declared | Automatic add, remove and move transitions |
| GSAP | `gsap` (+ `@gsap/react`) | 3.15.0 (2.1.2) | 2026-04-13 (2025-01-15) | Standard "no charge" license | `@gsap/react`: `react >=17` | Timeline animation |
| Lottie (lottie-web) | `lottie-react` | 3.1.2 | 2026-09-07 | MIT | `^18.2.0 \|\| ^19.0.0` | Playback of Lottie JSON animations |
| dotLottie | `@lottiefiles/dotlottie-react` | 0.20.0 | 2026-10-06 | MIT | `^17 \|\| ^18 \|\| ^19` | Playback of `.lottie` and Lottie JSON animations |
| vaul | `vaul` | 1.1.2 | 2024-12-14 | MIT | `^16.8` to `^19.0.0-rc` | Drawer (bottom sheet) |
| sonner | `sonner` | 2.0.8 | 2026-08-09 | MIT | `^18.0.0 \|\| ^19.0.0` | Toast notifications |
| Embla Carousel | `embla-carousel-react` | 8.6.0 | 2025-04-04 | MIT | `^16.8.0` to `^19.0.0-rc` | Swipeable carousel |
| dnd kit (current) | `@dnd-kit/react` | 0.5.1 | 2026-10-15 | MIT | `^18.0.0 \|\| ^19.0.0` | Drag and drop |
| dnd kit (earlier API) | `@dnd-kit/core` | 6.3.1 | 2024-12-05 | MIT | `>=16.8.0` | Drag and drop |
| Swiper | `swiper` | 14.3.0 | 2026-09-28 | MIT | Not declared | Touch slider |

As the table shows, every library except AutoAnimate and Swiper declares a React range that includes React 19, and those two declare no React range at all.

## Animation, gesture and interaction libraries in detail

Each subsection below states what the library does, its compatibility facts and its maintenance signals, with the install commands in the same Bun-then-npm order.

### Motion (motion.dev, formerly Framer Motion)

Motion is installed as `motion` and imported from `motion/react`. Its React page states that it "currently supports hover, tap, focus, and drag" gestures, that the `layout` prop animates changes of size, position and order, that `layoutId` animates between different elements, that `<AnimatePresence>` enables exit animations when elements are removed, and that the library is "fully tree-shakable so you only include what you import". The drag page documents `drag` (or `"x"` / `"y"` to lock an axis), `dragConstraints`, `dragElastic` (from `0` to `1`), `useDragControls`, and callbacks that receive the pointer event and an `info` object with `offset` and `velocity`. The older package name `framer-motion` is also published at the same version, 14.6.0. The builder preinstalls `motion` `^14.6.0` **(tested with React 19.3.1)**.

### @use-gesture/react

@use-gesture provides React hooks that turn pointer and touch events into gesture state. Its gestures page lists `useDrag`, `useMove`, `useHover`, `useScroll`, `useWheel`, `usePinch` and `useGesture` (several gestures in one hook). Each handler receives state such as `down`, `movement`, `offset`, `velocity` (in pixels per millisecond), `direction`, `swipe` (a vector of `-1`, `0` or `1` per axis), `first`, `last`, `tap` and `cancel`. The options page documents `axis`, `bounds`, `filterTaps`, `rubberband`, `from`, `pointer.touch`, `swipe.distance` (default `[50,50]`), `swipe.velocity` (default `[0.5,0.5]`) and the experimental `preventScroll`, and advises that "`touch-action: none` is a common CSS property that you'll set on draggable items". The latest version, 10.3.1, was published on 2024-03-21; its peer range `>= 16.8.0` includes React 19, and the builder preinstalls `^10.3.1` **(tested with React 19.3.1)**.

### react-spring

react-spring's getting-started page describes it as "a library for building interactive, data-driven, and animated UI components", and states that `@react-spring/web` (current 10.1.2) is for React 19 and later, while `@react-spring/web@9` is for React below 19. The @use-gesture documentation uses react-spring in its own drag example.

```sh
bun add @react-spring/web
npm install @react-spring/web
```

### AutoAnimate

AutoAnimate is "a zero-config, drop-in animation utility": it animates the children of a parent element when they are added, removed or moved. In React, the hook `useAutoAnimate` is imported from `@formkit/auto-animate/react` and returns a ref for the parent element. The page lists React, Vue, Preact, Solid, Svelte, Angular, Marko and plain JavaScript as supported.

### GSAP

GSAP is a JavaScript animation library. The npm license field of `gsap` reads "Standard 'no charge' license: https://gsap.com/standard-license", and that page states "GSAP is now free for everyone, thanks to Webflow's support!" The full license terms, including any restrictions, were not on the page as read and are **UNVERIFIED**. The React helper `@gsap/react` (2.1.2) declares `gsap ^3.12.5` and `react >=17` as peers.

### Lottie: lottie-react and dotlottie-react

Lottie is a JSON format for vector animations exported from design tools. `lottie-react` (3.1.2) depends on lottie-web; its README shows a `Lottie` component with `src`, `autoplay` and `loop` props and a `useLottie` hook. `@lottiefiles/dotlottie-react` (0.20.0) renders both Lottie JSON and dotLottie files (ZIP archives with the extension `.lottie` that bundle one or more animations and their resources); it depends on `@lottiefiles/dotlottie-web` 0.81.0 and its README shows a `DotLottieReact` component with `src`, `loop` and `autoplay`.

### vaul

vaul is "A drawer component for React", meaning a panel that slides up from the bottom of the screen and can be dragged closed. Its repository states: "This repo is unmaintained. I might come back to it at some point, but not in the near future." Its latest version, 1.1.2, was published on 2024-12-14. The shadcn/ui Drawer component has moved from vaul to Base UI, as noted above.

### sonner

sonner is a toast (short pop-up notification) library. Its page shows the minimal use: render `<Toaster />` once near the root and call `toast('My first toast')` from an event handler. It states that the swipe direction (for dismissing a toast) "changes depending on the position".

### Embla Carousel

Embla Carousel is "A lightweight carousel library with fluid motion and great swipe precision". The React package `embla-carousel-react` is at 8.6.0, published on 2025-04-04; the npm `next` tag points to the pre-release 9.0.0-rc04.

### dnd kit

dnd kit is "An extensible drag and drop toolkit written in TypeScript" whose sensors support "different input methods like mouse, touch, and keyboard". Two React packages are published. `@dnd-kit/react` (0.5.1, published 2026-10-15) is "The React adapter for @dnd-kit", built on `@dnd-kit/dom`, with `DragDropProvider`, `useDraggable` and `useDroppable`. `@dnd-kit/core` (6.3.1, published 2024-12-05) is the earlier API. The site does not say which one is recommended.

### Swiper

Swiper is a touch slider; its React page says "Swiper React is available only via NPM as a part of the main Swiper library" and that `swiper/react` exports the components `Swiper` and `SwiperSlide`. The package `swiper` (14.3.0, published 2026-09-28, MIT) declares no React peer range.

```sh
bun add swiper
npm install swiper
```

## Konsta UI integration

This section gives the exact setup for Konsta UI in a React, Tailwind CSS 4 and Vite app, taken from the Konsta repository at commit `5b8e54d35ba7`, the published `konsta@5.5.0` package and the Konsta documentation pages listed above. Every step was tested in a Vite 8 app with React 19.3.1 **(tested)**. The steps are: install the package, enable the Tailwind Vite plugin, import the theme stylesheet, prepare the HTML viewport, wrap the app in the `App` component, and handle dark mode and safe areas.

### 1. Install the package

The package name is `konsta` (version 5.5.0). The Konsta installation page assumes React and Tailwind CSS are already installed; in a generated app they are. On any operating system, from the app's folder:

```sh
bun add konsta
npm install konsta
```

### 2. Enable Tailwind CSS in Vite

Konsta's own React demo app uses this Vite configuration (`kitchen-sink/react/vite.config.js`), which the builder's templates already follow:

```ts
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default { plugins: [react(), tailwindcss()] };
```

### 3. Import the theme stylesheet

The installation page gives these two lines for the app's main CSS file, in this order:

```css
@import 'tailwindcss';
/* import Konsta UI theme */
@import 'konsta/react/theme.css';
```

The published `konsta/react/theme.css` contains `@source` lines that tell Tailwind to scan Konsta's component files for class names, followed by an import of Konsta's base styles (colors, the `ios:` and `material:` variants, touch ripple, hairlines and safe areas). No separate Tailwind configuration file is needed.

To change the brand color, add a `@theme` block that sets `--color-brand-primary`, as Konsta's demo app does. Konsta's color plugin (`plugin-colors.js`) converts this value with a hex-to-RGB function and derives the iOS and Material color tokens from it, so give a hexadecimal color. The output CSS then contains `--k-color-primary` with the chosen color **(tested)**:

```css
@theme {
  --color-brand-primary: #ff3b30;
}
```

For the Material theme on the web, the installation page also suggests loading the Roboto font (`https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,400;0,500;0,700;1,400;1,500;1,700&display=swap`); the iOS theme uses the system font. This step is optional and loads the font from the internet.

### 4. Prepare the viewport

The safe-areas page states: "If your app targets full screen mobile devices, make sure you have `viewport-fit=cover`" in the viewport meta tag. The tested `index.html` used:

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

### 5. Wrap the app in the `App` component

`App` is both the root container and the provider of Konsta's settings. The usage page states that it "ideally should be the main root component" and shows:

```tsx
import { App, Page, Navbar, Block } from 'konsta/react';

export default function MyApp() {
  return (
    <App theme="ios" safeAreas>
      <Page>
        <Navbar title="My App" />
        <Block>Content</Block>
      </Page>
    </App>
  );
}
```

The table below lists the `App` props as declared in `src/types/App.d.ts`, with the defaults found in the compiled 5.5.0 component (`react/components/App.js`).

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `theme` | `'ios' \| 'material' \| 'parent'` | `'material'` | The look of every component. `'parent'` reads an `ios`, `md` or `material` class on the `<html>` element, for use alongside Framework7 or Ionic. |
| `dark` | `boolean` | See the note below | Whether components include their `dark:` variant classes. |
| `safeAreas` | `boolean` | `true` | Adds the `safe-areas` class to the container so safe-area insets apply. |
| `materialTouchRipple` | `boolean` | `true` | Enables the touch ripple in the Material theme, for all components. |
| `iosHoverHighlight` | `boolean` | `true` | Enables the touch highlight in the iOS theme, for all components. |
| `component` | `string \| React.ComponentType` | `'div'` | The HTML element or component that renders the container. |

There is a discrepancy for `dark`: the type file and the App documentation page both give the default as `false`, but the compiled 5.5.0 component sets `dark = true`. In the tested render, `dark:` classes were present without passing the prop. To avoid depending on either default, pass `dark` explicitly. Because `theme` is an ordinary prop, the app can compute it at run time (for example from a setting) instead of fixing it at build time; platform detection is left out of this document because no Konsta source describes it.

When Konsta is used inside another framework, the usage page says to use `KonstaProvider` from `konsta/react` to set the same globals and to add `k-ios` or `k-material` to the app's root element. `KonstaProvider` accepts `theme`, `dark`, `materialTouchRipple`, `iosHoverHighlight` and `autoThemeDetection` (`react/shared/KonstaProvider.js`).

### 6. Dark mode

Konsta's dark styles are switched by a `dark` class, not by a prop. Its base stylesheet declares `@custom-variant dark (&:where(.dark, .dark *));` and gives `.dark` a black background and white text, and Konsta's demo app turns dark mode on and off by adding and removing `dark` on `document.documentElement`. The `dark` prop on `App` only controls whether components carry their `dark:` classes. A minimal toggle is therefore:

```ts
document.documentElement.classList.toggle('dark', isDark);
```

The builder's shadcn stylesheet (`shared/renderer/styles/globals.css`) also keys dark mode on a `dark` class, with `@custom-variant dark (&:is(.dark *));`, so a single class toggle drives both.

### 7. Safe areas

With `safeAreas` enabled, the container gets the `safe-areas` class, which sets four variables, `--k-safe-area-top`, `--k-safe-area-right`, `--k-safe-area-bottom` and `--k-safe-area-left`, to the matching `env(safe-area-inset-*)` values where the browser supports them, and to `0px` otherwise (`styles/safe-areas.css`). Konsta's bars and lists already pad themselves with these variables; for example, the tested Navbar rendered with `pt-[max(16px,var(--k-safe-area-top))]`. For custom elements, the safe-areas page documents utilities such as `pt-safe`, `top-safe`, `left-safe` and `bottom-4-safe` (the last sets `bottom: calc(1rem + var(--k-safe-area-bottom))`). The classes `no-safe-areas`, `no-safe-areas-top`, `no-safe-areas-right`, `no-safe-areas-bottom` and `no-safe-areas-left` switch the insets off for elements that are not full screen, such as modals and side panels.

### 8. Theme-specific styles

The theme-variants page documents two Tailwind variants, `ios:` (applied under `.k-ios`) and `material:` (applied under `.k-material`), for styles that should differ per theme:

```tsx
<span className="ios:font-bold material:font-semibold">Hello</span>
```

### 9. Using Konsta and shadcn/ui stylesheets together

Both stylesheets define the Tailwind color token `--color-primary`: shadcn's maps it to `var(--primary)` and Konsta's to `var(--k-color-primary)`. When both are imported into one CSS entry, the one imported last decides what utilities such as `bg-primary` mean. With shadcn's stylesheet first and Konsta's second, `bg-primary` compiled to `var(--color-primary)` (Konsta's color); with Konsta first and shadcn second, it compiled to `var(--primary)` (shadcn's color) **(tested)**. An app that mixes both kits should pick one order deliberately.

## Motion and @use-gesture integration

This section shows minimal usage of the two libraries the builder preinstalls: `motion` `^14.6.0` and `@use-gesture/react` `^10.3.1`. Each snippet below was type-checked with TypeScript in strict mode and built with Vite against React 19.3.1 **(tested)**. If an app does not have them, install them on any operating system with:

```sh
bun add motion @use-gesture/react
npm install motion @use-gesture/react
```

### Enter, exit and tap animation with Motion

The first snippet animates an element in when it appears, out when it is removed (through `AnimatePresence`), and shrinks it slightly while it is pressed (`whileTap`).

```tsx
import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

export function Reveal() {
  const [open, setOpen] = useState(true);
  return (
    <>
      <button type="button" onClick={() => setOpen(!open)}>Toggle</button>
      <AnimatePresence>
        {open && (
          <motion.div
            key="box"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            whileTap={{ scale: 0.95 }}
          >
            Hello
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
```

### Drag with Motion alone

Motion's own drag support is enough for a horizontally draggable element with limits and an elastic edge; `onDragEnd` receives the pointer event and an `info` object with `offset` and `velocity`.

```tsx
import { motion } from 'motion/react';

export function DragHandle() {
  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: -100, right: 100 }}
      dragElastic={0.2}
      onDragEnd={(_event, info) => console.log(info.offset.x, info.velocity.x)}
    >
      Drag me
    </motion.div>
  );
}
```

### @use-gesture on a plain element

This snippet uses `useDrag` alone. It follows the finger horizontally, snaps back on release, and calls `onDismiss` when the gesture qualifies as a swipe (by default, at least 50 pixels and 0.5 pixels per millisecond). The `touch-action: pan-y` style lets the page still scroll vertically, following the options page's touch-action guidance.

```tsx
import { useState } from 'react';
import { useDrag } from '@use-gesture/react';

export function SwipeToDismiss({ onDismiss }: { onDismiss: () => void }) {
  const [dx, setDx] = useState(0);
  const bind = useDrag(
    ({ down, movement: [mx], swipe: [swipeX] }) => {
      if (swipeX !== 0) onDismiss();
      setDx(down ? mx : 0);
    },
    { axis: 'x', filterTaps: true },
  );
  return (
    <div {...bind()} style={{ transform: `translateX(${dx}px)`, touchAction: 'pan-y' }}>
      Swipe left or right to dismiss
    </div>
  );
}
```

### @use-gesture driving a Motion element

The two libraries combine well: @use-gesture recognizes the gesture and Motion animates the result with a spring. Spreading `{...bind()}` onto a `motion.div` fails TypeScript's strict check, because React's `onAnimationStart` event prop and Motion's `onAnimationStart` callback have different types **(tested)**. Attaching the gesture through the `target` option with a ref avoids the spread. The element follows the finger through a Motion value and springs back on release.

```tsx
import { useRef } from 'react';
import { animate, motion, useMotionValue } from 'motion/react';
import { useDrag } from '@use-gesture/react';

export function SwipeCard() {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  useDrag(
    ({ down, movement: [mx] }) => {
      if (down) x.set(mx);
      else animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 });
    },
    { target: ref, axis: 'x', filterTaps: true },
  );
  return (
    <motion.div ref={ref} style={{ x, touchAction: 'pan-y' }}>
      Swipe me
    </motion.div>
  );
}
```

These four patterns cover entering and leaving, pressing, dragging and swiping; pinch and wheel gestures use `usePinch`, `useWheel` or `useGesture` in the same way.

## What the builder offers and how to switch kits by hand

Desktop Starter App Builder (the generator this app or repository comes from) offers two kits as plan choices. The project plan field `ui` takes `"shadcn"` (the default) or `"konsta"`, and, for Konsta only, the field `uiTheme` takes `"ios"` or `"material"`, with `"ios"` used when the field is omitted (`cli/lib/plan.ts`, `config/catalog.json` key `uiKits`). The catalog describes shadcn/ui as the default and desktop-style kit, built from Radix primitives styled with Tailwind CSS, and Konsta UI as the kit for an app-store look, "especially with Tauri's Android/iOS targets", noting that "Module panels keep their shadcn/ui components". For Konsta, the catalog adds `konsta` `^5.5.0` to the app's dependencies and applies overlays listed as `ui/konsta/renderer` plus `ui/konsta/electron` or `ui/konsta/tauri`. Both Electron and Tauri templates list `motion` `^14.6.0` and `@use-gesture/react` `^10.3.1` as dependencies, so every generated app has them whichever kit is chosen.

Any other kit in this survey can be adopted by hand in a generated app. The interface code lives in `src/renderer` for Electron apps and in `src` for Tauri apps (the `rendererDir` values in `config/catalog.json`), and its global stylesheet is `styles/globals.css` inside that folder. The steps are the same for every kit:

1. Install the kit's packages with the commands given in its section above (Bun first, npm second), on any operating system, from the app's folder.
2. Add the kit's stylesheet. For a Tailwind-based kit (Konsta UI, HeroUI, daisyUI), add its import or plugin line to `styles/globals.css` after `@import "tailwindcss";`, keeping in mind the import-order effect on shared tokens described in "Using Konsta and shadcn/ui stylesheets together". For a kit with its own stylesheet (Mantine, Radix Themes), import that file once at the app's entry point. For a CSS-in-JavaScript kit (MUI, Chakra UI), follow its Tailwind interoperability guidance where one is published, such as MUI's CSS-layer setup.
3. Wrap the root component in the kit's provider if it has one (`App` or `KonstaProvider` for Konsta, `MantineProvider`, Chakra's `Provider`, Radix Themes' `Theme`, `FluentProvider`; HeroUI states it needs none; Ionic is configured with `setupIonicReact`).
4. Replace the components in the screens one at a time, and keep the dark-mode switch consistent: the builder's stylesheet and Konsta both use a `dark` class on the `<html>` element, while other kits use their own mechanism (for example Chakra's `next-themes`).
5. Remove packages the app no longer imports, then run the app's checks.

Switching kits this way changes only the interface layer; the native side of the app and its modules are not affected. The choice of kit remains the reader's, and the survey above is intended to supply the facts needed to make it.
