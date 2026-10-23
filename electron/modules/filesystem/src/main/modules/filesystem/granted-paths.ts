/**
 * Remembers which files the user chose in a native dialog during this session.
 * The renderer may only read or write those exact files, so a compromised
 * page cannot ask for arbitrary paths such as ~/.ssh/id_rsa.
 */
import path from "node:path";

export function createGrantList() {
  const granted = new Set<string>();
  const normalize = (file: string) => path.resolve(file);
  return {
    grant(file: string): string {
      const absolute = normalize(file);
      granted.add(absolute);
      return absolute;
    },
    assertGranted(file: string): string {
      const absolute = normalize(file);
      if (!granted.has(absolute)) {
        throw new Error("This file was not chosen in a dialog during this session.");
      }
      return absolute;
    },
  };
}
