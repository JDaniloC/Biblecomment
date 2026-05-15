"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_PREFIX = "bc:community-filter:";

export const GENERAL_BUCKET = "general";

/**
 * Selected community filter state, persisted to localStorage per-username so
 * different accounts on the same browser don't share the same chip selection.
 *
 * Storage shape: an array of slugs. The literal "general" represents the
 * unmarked / geral feed bucket. An empty array equals "show nothing" — the
 * chapter API maps that to "general only" so toggling all chips off still
 * shows something. `null` (default) means "no filter applied" — chapters
 * show every comment, mirroring legacy behavior so anonymous users and
 * users in zero communities don't even see the chip row.
 */
export type CommunityFilter = string[] | null;

function storageKey(username?: string | null): string {
  return `${STORAGE_PREFIX}${username ?? "anon"}`;
}

export function useCommunityFilter(
  username?: string | null,
): {
  selected: CommunityFilter;
  setSelected: (next: CommunityFilter) => void;
  toggle: (slug: string) => void;
  queryString: string;
} {
  const [selected, setSelectedState] = useState<CommunityFilter>(null);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate on mount — localStorage isn't available during SSR.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(username));
      if (raw === null) {
        setSelectedState(null);
      } else {
        const parsed = JSON.parse(raw) as unknown;
        setSelectedState(Array.isArray(parsed) ? (parsed as string[]) : null);
      }
    } catch {
      setSelectedState(null);
    } finally {
      setHydrated(true);
    }
  }, [username]);

  const setSelected = useCallback(
    (next: CommunityFilter) => {
      setSelectedState(next);
      if (!hydrated) return;
      try {
        if (next === null) {
          localStorage.removeItem(storageKey(username));
        } else {
          localStorage.setItem(storageKey(username), JSON.stringify(next));
        }
      } catch {
        // localStorage may be disabled (private mode, full quota). Silently
        // keep in-memory state — the filter still works for the session.
      }
    },
    [hydrated, username],
  );

  const toggle = useCallback(
    (slug: string) => {
      const current = selected ?? [];
      const next = current.includes(slug)
        ? current.filter((s) => s !== slug)
        : [...current, slug];
      setSelected(next);
    },
    [selected, setSelected],
  );

  const queryString =
    selected === null ? "" : `?communities=${encodeURIComponent(selected.join(","))}`;

  return { selected, setSelected, toggle, queryString };
}
