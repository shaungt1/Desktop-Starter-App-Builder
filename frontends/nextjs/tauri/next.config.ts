/**
 * Next.js configuration for a Tauri app. Tauri has no Node server, so every
 * route is exported as static files into out/ (tauri.conf.json frontendDist).
 * Settings follow the Tauri guide for Next.js.
 */
import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";
// Set by `tauri android dev` / `tauri ios dev` so a phone on the network can reach the dev server.
const internalHost = process.env.TAURI_DEV_HOST || "localhost";

const nextConfig: NextConfig = {
  output: "export",
  // The image optimizer needs a server; exported images are served as-is.
  images: { unoptimized: true },
  // Without this, assets do not resolve when the dev server is reached from the Tauri window or a device.
  assetPrefix: isProduction ? undefined : `http://${internalHost}:3000`,
  // The Next.js dev server rejects requests from other hosts; allow the device's address during mobile development.
  ...(process.env.TAURI_DEV_HOST ? { allowedDevOrigins: [process.env.TAURI_DEV_HOST] } : {}),
};

export default nextConfig;
