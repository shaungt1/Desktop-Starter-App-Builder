import path from "node:path";
import { describe, expect, it } from "vitest";
import { exportCandidates } from "./export-path";

const root = path.resolve("/srv/export");

describe("exportCandidates", () => {
  it("maps routes the way static hosts do", () => {
    expect(exportCandidates(root, "app://bundle/")).toEqual([path.join(root, "index.html")]);
    expect(exportCandidates(root, "app://bundle/about")).toEqual([
      path.join(root, "about.html"),
      path.join(root, "about", "index.html"),
    ]);
    expect(exportCandidates(root, "app://bundle/_next/static/app.js")).toEqual([
      path.join(root, "_next", "static", "app.js"),
    ]);
  });

  it("never resolves outside the export folder", () => {
    const attempts = [
      "app://bundle/../secrets.txt",
      "app://bundle/%2e%2e/%2e%2e/etc/passwd",
      "app://bundle/..%2f..%2fetc%2fpasswd",
      "app://bundle/..%5c..%5cwindows%5cwin.ini",
    ];
    for (const attempt of attempts) {
      for (const candidate of exportCandidates(root, attempt)) {
        expect(candidate.startsWith(`${root}${path.sep}`)).toBe(true);
      }
    }
    expect(exportCandidates(root, "app://bundle/a%00b")).toEqual([]);
  });
});
