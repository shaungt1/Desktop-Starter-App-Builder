/** Typed wrappers for the secure-storage commands. There is deliberately no "get". */
import { invoke } from "@tauri-apps/api/core";

export const secureStorage = {
  status: () => invoke<{ available: boolean; detail: string | null }>("secret_status"),
  has: (key: string) => invoke<boolean>("secret_has", { key }),
  set: (key: string, value: string) => invoke<void>("secret_set", { key, value }),
  delete: (key: string) => invoke<boolean>("secret_delete", { key }),
};
