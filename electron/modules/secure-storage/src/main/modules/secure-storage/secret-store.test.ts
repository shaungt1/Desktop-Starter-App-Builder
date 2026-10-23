import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { type Cipher, createSecretStore } from "./secret-store";

const fakeCipher = (available = true): Cipher => ({
  isEncryptionAvailable: () => available,
  encryptString: (plain) => Buffer.from([...plain].reverse().join("")),
  decryptString: (encrypted) => [...encrypted.toString()].reverse().join(""),
});

const tempFile = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), "secrets-")), "secrets.json");

describe("secret store", () => {
  it("round-trips values and never writes plain text", () => {
    const file = tempFile();
    const store = createSecretStore(file, fakeCipher());
    store.set("auth.refresh", "s3cret-value");
    expect(fs.readFileSync(file, "utf8")).not.toContain("s3cret-value");
    expect(store.get("auth.refresh")).toBe("s3cret-value");
    expect(store.delete("auth.refresh")).toBe(true);
    expect(store.has("auth.refresh")).toBe(false);
  });

  it("refuses to store when encryption is unavailable", () => {
    const store = createSecretStore(tempFile(), fakeCipher(false));
    expect(() => store.set("token", "x")).toThrow(/unavailable/u);
  });

  it("rejects unsafe keys", () => {
    const store = createSecretStore(tempFile(), fakeCipher());
    expect(() => store.set("../escape", "x")).toThrow(/Secret keys/u);
  });
});
