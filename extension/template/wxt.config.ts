import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";
import generated from "./src/permissions.generated.json";

// Build configuration for the extension (WXT). WXT assembles manifest.json from
// this file, package.json (version) and the files in entrypoints/. Permissions
// requested by optional modules are merged in from src/permissions.generated.json,
// which the builder writes; add your own permissions here and keep the list as
// small as the extension can work with (docs/extension/02-permissions-and-security.md).
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  vite: () => ({ plugins: [tailwindcss()] }),
  manifest: ({ browser }) => ({
    name: "__APP_NAME__",
    description: "__APP_DESCRIPTION__",
    // Firefox's sidebar needs no permission, and "sidePanel" is a Chromium-only name, so it is left out there.
    permissions: [
      "storage",
      ...generated.permissions.filter((permission) => !(browser === "firefox" && permission === "sidePanel")),
    ],
    ...(generated.host_permissions.length > 0 ? { host_permissions: generated.host_permissions } : {}),
    // Firefox needs a stable add-on id (replace this value with an id you own before publishing) and, for new
    // extensions, a declaration of the data the extension collects. "none" says it collects nothing; if it sends
    // user data anywhere, list the matching categories instead (docs/extension/07-publishing-and-stores.md).
    ...(browser === "firefox"
      ? {
          browser_specific_settings: {
            gecko: { id: "__APP_SLUG__@__APP_ID__", data_collection_permissions: { required: ["none"] } },
          },
        }
      : {}),
  }),
});
