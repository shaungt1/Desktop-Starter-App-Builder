/**
 * Maps an app://bundle/... request to a file inside the static export folder.
 * Pure function (no Electron imports) so it can be unit-tested.
 */
import path from "node:path";

/**
 * Returns candidate file paths for a request, most specific first, or an
 * empty list when the request tries to leave the export folder.
 * Mirrors how static hosts serve `next export` output:
 * "/" -> index.html, "/about" -> about.html or about/index.html.
 */
export function exportCandidates(root: string, requestUrl: string): string[] {
  let pathname: string;
  try {
    pathname = decodeURIComponent(new URL(requestUrl).pathname);
  } catch {
    return [];
  }
  if (pathname.includes("\0")) {
    return [];
  }
  const resolvedRoot = path.resolve(root);
  const target = path.resolve(resolvedRoot, `.${path.posix.normalize(pathname)}`);
  if (target !== resolvedRoot && !target.startsWith(`${resolvedRoot}${path.sep}`)) {
    return [];
  }
  if (pathname.endsWith("/")) {
    return [path.join(target, "index.html")];
  }
  if (path.extname(target)) {
    return [target];
  }
  return [`${target}.html`, path.join(target, "index.html")];
}
