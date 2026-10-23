/**
 * Encrypted key-value store for tokens and credentials.
 *
 * Values are encrypted with Electron's safeStorage, which uses the operating
 * system's key store (Windows DPAPI, macOS Keychain, Linux Secret Service or
 * KWallet), and the ciphertext is saved to secrets.json in the user-data
 * folder. Plain text never touches disk. When the OS key store is unavailable
 * (some Linux setups), writes fail instead of silently storing plain text.
 */
import fs from "node:fs";
import path from "node:path";

export interface Cipher {
  isEncryptionAvailable(): boolean;
  encryptString(plain: string): Buffer;
  decryptString(encrypted: Buffer): string;
}

const KEY = /^[a-z0-9][a-z0-9._:-]{0,127}$/iu;

export function assertSecretKey(key: string): void {
  if (!KEY.test(key)) {
    throw new Error("Secret keys use letters, digits, '.', '_', ':' or '-' (max 128 characters).");
  }
}

export function createSecretStore(file: string, cipher: Cipher) {
  const read = (): Record<string, string> => {
    try {
      return JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, string>;
    } catch {
      return {};
    }
  };
  const write = (data: Record<string, string>) => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temporary = `${file}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(data), { mode: 0o600 });
    fs.renameSync(temporary, file);
  };

  return {
    available: () => cipher.isEncryptionAvailable(),
    has(key: string): boolean {
      assertSecretKey(key);
      return key in read();
    },
    get(key: string): string | undefined {
      assertSecretKey(key);
      const encrypted = read()[key];
      return encrypted === undefined ? undefined : cipher.decryptString(Buffer.from(encrypted, "base64"));
    },
    set(key: string, value: string): void {
      assertSecretKey(key);
      if (!cipher.isEncryptionAvailable()) {
        throw new Error("The operating system key store is unavailable; refusing to store the secret unencrypted.");
      }
      const data = read();
      data[key] = cipher.encryptString(value).toString("base64");
      write(data);
    },
    delete(key: string): boolean {
      assertSecretKey(key);
      const data = read();
      if (!(key in data)) {
        return false;
      }
      delete data[key];
      write(data);
      return true;
    },
    keys: (): string[] => Object.keys(read()),
  };
}

export type SecretStore = ReturnType<typeof createSecretStore>;
