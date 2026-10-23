import * as Sentry from "@sentry/electron/renderer";
import { useQuery } from "@tanstack/react-query";
import { ipc } from "@/lib/ipc";
import type { RendererFeature } from "../types";

// Renderer errors are forwarded to the main process, which sends them to Sentry.
// Skipped where no window exists (the Next.js frontend pre-renders pages at build time).
if (typeof window !== "undefined") {
  Sentry.init({});
}

function CrashReportingPanel() {
  const status = useQuery({ queryKey: ["crash-reporting"], queryFn: () => ipc.crashReporting.status() });
  return (
    <p className="text-sm">
      {status.data?.enabled ? "Errors and crashes are reported." : "Reporting is off (no DSN configured)."}
    </p>
  );
}

export const feature: RendererFeature = {
  id: "crash-reporting",
  title: "Crash reporting",
  description: "Errors from every process are sent to your Sentry project.",
  Panel: CrashReportingPanel,
};
