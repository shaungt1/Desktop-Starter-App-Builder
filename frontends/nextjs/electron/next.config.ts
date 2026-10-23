/**
 * Next.js configuration for an Electron app. Every route is exported as
 * static files into web-export/, which Electron Forge ships next to the app
 * and the main process serves through the private app:// scheme
 * (src/main/content.ts). out/ is left to Electron Forge's own output.
 */
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  distDir: "web-export",
  // The image optimizer needs a server; exported images are served as-is.
  images: { unoptimized: true },
};

export default nextConfig;
