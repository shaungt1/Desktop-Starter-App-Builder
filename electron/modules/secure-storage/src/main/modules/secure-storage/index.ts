/**
 * Secure storage module. Other main-process modules call `getSecretStore()`
 * (for example sign-in stores tokens here). The renderer can store, check
 * and delete secrets but can never read one back.
 */
import path from "node:path";
import { safeStorage } from "electron";
import { z } from "zod";
import { procedure } from "../../ipc/procedure";
import { defineMainModule } from "../types";
import { createSecretStore, type SecretStore } from "./secret-store";

let store: SecretStore | undefined;

export function getSecretStore(): SecretStore {
  if (!store) {
    throw new Error("Secure storage not started yet.");
  }
  return store;
}

const keyInput = z.object({ key: z.string().min(1).max(128) });

export const mainModule = defineMainModule({
  id: "secure-storage",
  setup({ app, logger }) {
    store = createSecretStore(path.join(app.getPath("userData"), "secrets.json"), safeStorage);
    if (!store.available()) {
      logger.warn("OS key store unavailable: secure storage will refuse writes.");
    }
  },
  router: {
    status: procedure.handler(() => ({
      available: getSecretStore().available(),
      backend: process.platform === "linux" ? safeStorage.getSelectedStorageBackend() : "os",
      count: getSecretStore().keys().length,
    })),
    has: procedure.input(keyInput).handler(({ input }) => getSecretStore().has(input.key)),
    set: procedure
      .input(keyInput.extend({ value: z.string().max(64_000) }))
      .handler(({ input }) => getSecretStore().set(input.key, input.value)),
    delete: procedure.input(keyInput).handler(({ input }) => getSecretStore().delete(input.key)),
  },
});
