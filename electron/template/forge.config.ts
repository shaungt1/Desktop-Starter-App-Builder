/**
 * Electron Forge configuration: how the app is bundled (Vite), packaged,
 * hardened (Fuses), turned into installers (makers) and published.
 * Identity values come from app.config.json, which the builder writes from the plan.
 */

import fs from "node:fs";
import path from "node:path";
import { FuseV1Options, FuseVersion } from "@electron/fuses";
import { MakerDeb } from "@electron-forge/maker-deb";
import { MakerDMG } from "@electron-forge/maker-dmg";
import { MakerSquirrel } from "@electron-forge/maker-squirrel";
import { MakerZIP } from "@electron-forge/maker-zip";
import { AutoUnpackNativesPlugin } from "@electron-forge/plugin-auto-unpack-natives";
import { FusesPlugin } from "@electron-forge/plugin-fuses";
import { VitePlugin } from "@electron-forge/plugin-vite";
import { PublisherGitHub } from "@electron-forge/publisher-github";
import type { ForgeConfig } from "@electron-forge/shared-types";
import appConfig from "./app.config.json";

/** Each file in src/main/workers becomes its own bundle, started with utilityProcess.fork(). */
const WORKERS_DIR = "src/main/workers";
const workerEntries = fs.existsSync(WORKERS_DIR)
  ? fs
      .readdirSync(WORKERS_DIR)
      .filter((file) => file.endsWith(".ts") && !file.endsWith(".test.ts"))
      .map((file) => ({ entry: path.join(WORKERS_DIR, file), config: "vite.main.config.mts", target: "main" as const }))
  : [];

const [repositoryOwner, repositoryName] = (appConfig.repository ?? "").split("/");

/**
 * Windows code signing, active only when a certificate file is provided
 * (the release workflow decodes the WINDOWS_CERTIFICATE secret into this file).
 * See docs/electron/03-signing.md.
 */
const windowsSign = process.env.WINDOWS_CERTIFICATE_FILE
  ? {
      certificateFile: process.env.WINDOWS_CERTIFICATE_FILE,
      certificatePassword: process.env.WINDOWS_CERTIFICATE_PASSWORD,
    }
  : undefined;

const config: ForgeConfig = {
  packagerConfig: {
    name: appConfig.name,
    executableName: "__APP_SLUG__",
    appBundleId: appConfig.appId,
    icon: "assets/icon",
    asar: true,
    // Registers the deep-link scheme on macOS (Windows/Linux register at runtime and in the .deb).
    protocols: [{ name: appConfig.name, schemes: [appConfig.scheme] }],
    // Files shipped next to app.asar (read with resourcePath() in src/main/resources.ts).
    // The exported profile and the Next.js frontend also ship their static web build.
    extraResource: [
      "assets/icon.png",
      ...(appConfig.profile === "exported" || appConfig.frontend === "nextjs" ? ["web-export"] : []),
    ],
    ...(windowsSign ? { windowsSign } : {}),
    // macOS signing/notarization: set these environment variables in CI (see docs/electron/03-signing.md).
    ...(process.env.APPLE_SIGNING_IDENTITY
      ? {
          osxSign: { identity: process.env.APPLE_SIGNING_IDENTITY },
          osxNotarize: {
            appleId: process.env.APPLE_ID ?? "",
            appleIdPassword: process.env.APPLE_PASSWORD ?? "",
            teamId: process.env.APPLE_TEAM_ID ?? "",
          },
        }
      : {}),
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({
      name: "__APP_SLUG__",
      setupIcon: "assets/icon.ico",
      ...(windowsSign ? { windowsSign } : {}),
    }),
    new MakerZIP({}, ["darwin", "linux"]),
    new MakerDMG({ icon: "assets/icon.icns" }, ["darwin"]),
    new MakerDeb({
      options: {
        name: "__APP_SLUG__",
        productName: appConfig.name,
        icon: "assets/icon.png",
        categories: ["Utility"],
        mimeType: [`x-scheme-handler/${appConfig.scheme}`],
      },
    }),
  ],
  publishers:
    repositoryOwner && repositoryName
      ? [new PublisherGitHub({ repository: { owner: repositoryOwner, name: repositoryName }, draft: true })]
      : [],
  plugins: [
    new AutoUnpackNativesPlugin({}),
    new VitePlugin({
      build: [
        { entry: "src/main/main.ts", config: "vite.main.config.mts", target: "main" },
        { entry: "src/preload/preload.ts", config: "vite.preload.config.mts", target: "preload" },
        ...workerEntries,
      ],
      // The Next.js frontend is built by `next build` instead of a Vite renderer.
      renderer: appConfig.frontend === "nextjs" ? [] : [{ name: "main_window", config: "vite.renderer.config.mts" }],
    }),
    // Build-time security switches baked into the packaged binary.
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
