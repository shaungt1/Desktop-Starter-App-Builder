/**
 * Runtime configuration written by the builder from the project plan.
 * Contains no secrets: values here are bundled into the app.
 */
import raw from "../../app.config.json";

export type Profile = "native" | "remote" | "exported";

export interface AppConfig {
  name: string;
  appId: string;
  scheme: string;
  version: string;
  profile: Profile;
  remoteUrl: string | null;
  allowedOrigins: string[];
  repository: string | null;
  modules: string[];
  moduleOptions: Record<string, Record<string, unknown>>;
}

export const appConfig = raw as AppConfig;

/** Returns one module's options from the plan, or an empty object. */
export function moduleOptions<T extends Record<string, unknown>>(moduleId: string): Partial<T> {
  return (appConfig.moduleOptions[moduleId] ?? {}) as Partial<T>;
}
