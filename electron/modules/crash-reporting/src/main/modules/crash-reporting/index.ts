/**
 * Crash and error reporting with Sentry, covering the main process, the
 * renderer (see src/renderer/features/crash-reporting) and native crashes.
 *
 * Plan option: moduleOptions["crash-reporting"].dsn — the project DSN from
 * Sentry (it identifies the project; it is not a secret). Optional:
 * environment (default "production").
 */
import * as Sentry from "@sentry/electron/main";
import { moduleOptions } from "../../app-config";
import { procedure } from "../../ipc/procedure";
import { defineMainModule } from "../types";

interface Options extends Record<string, unknown> {
  dsn: string;
  environment: string;
}

let enabled = false;

export const mainModule = defineMainModule({
  id: "crash-reporting",
  beforeReady({ app, logger }) {
    const options = moduleOptions<Options>("crash-reporting");
    if (!options.dsn) {
      logger.warn("crash-reporting: no dsn configured; reporting is off");
      return;
    }
    Sentry.init({
      dsn: options.dsn,
      release: `${app.getName()}@${app.getVersion()}`,
      environment: options.environment ?? (app.isPackaged ? "production" : "development"),
    });
    enabled = true;
  },
  router: {
    status: procedure.handler(() => ({ enabled })),
  },
});
