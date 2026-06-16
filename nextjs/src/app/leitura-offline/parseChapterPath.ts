// Parses a chapter target out of a /verses/:abbrev/:number pathname.
//
// Lives in its own module (NOT exported from page.tsx) because App Router page
// files may only export `default` + the metadata/route allowlist — any other
// named export fails `next build`'s generated page-type check.
//
// The SW serves the /leitura-offline document for a failed
// /verses/:abbrev/:number navigation while keeping the address bar on the real
// chapter URL, so the shell reads its target from location.pathname.
export function parseChapterPath(
  pathname: string,
): { abbrev: string; chapter: number } | null {
  const match = pathname.match(/^\/verses\/([^/]+)\/(\d+)\/?$/);
  if (!match) return null;
  const chapter = parseInt(match[2], 10);
  if (Number.isNaN(chapter)) return null;
  return { abbrev: match[1], chapter };
}
