/**
 * Application logger. electron-log writes to the platform log folder
 * (Windows: %APPDATA%\<app>\logs, macOS: ~/Library/Logs/<app>, Linux: ~/.config/<app>/logs)
 * and to the console during development.
 */
import log from "electron-log/main";

log.initialize();
log.transports.file.level = "info";
log.transports.console.level = process.env.NODE_ENV === "development" ? "debug" : "warn";

export type Logger = typeof log;
export const logger: Logger = log;
