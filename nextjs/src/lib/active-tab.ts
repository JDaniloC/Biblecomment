export type TabId = "livros" | "discussoes" | "comunidades" | "notificacoes";

/** Resolves the active bottom-tab from the current pathname, or null. */
export function activeTab(pathname: string): TabId | null {
  if (
    pathname === "/home" ||
    pathname.startsWith("/verses/") ||
    pathname.startsWith("/chapter/")
  )
    return "livros";
  if (pathname === "/discussions" || pathname.startsWith("/discussion/"))
    return "discussoes";
  if (pathname === "/communities" || pathname.startsWith("/communities/"))
    return "comunidades";
  return null;
}
