# Shared interface

Components and styles in `renderer/` are copied into every generated app, whichever base it uses.
The generator copies this folder to `src/renderer/` (Electron) or `src/` (Tauri),
where the import alias `@/` points.

- `components/ui/` — accessible primitives in the shadcn/ui style (source you own, no runtime library).
- `lib/utils.ts` — `cn()` for composing Tailwind classes.
- `styles/globals.css` — design tokens; the generator writes the plan's brand colors here.

Add more shadcn components inside a generated app with `bunx shadcn@latest add <name>`;
the app's `components.json` points the CLI at these folders.
