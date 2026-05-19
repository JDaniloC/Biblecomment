"use client";

import { useCallback, useEffect, useState } from "react";
import { communityService } from "@/services/communities";

const STORAGE_PREFIX = "bc:community-filter:";

export function activeStorageKey(username?: string | null): string {
  return `${STORAGE_PREFIX}${username ?? "anon"}`;
}

/**
 * Stored value is a plain slug string (single active community) or the
 * key is absent (= no active community → all comments in `others`).
 * Legacy multi-select stored a JSON array; treat that as "none" so the
 * old shape degrades gracefully instead of becoming a bogus slug.
 */
export function parseActive(raw: string | null): string | null {
  if (raw === null) return null;
  const v = raw.trim();
  if (!v || v.startsWith("[") || v.startsWith("{")) return null;
  return v;
}

/** Query string for the comment API: `?community=slug` or empty. */
export function activeQueryString(active: string | null): string {
  return active ? `?community=${encodeURIComponent(active)}` : "";
}

export interface ApprovedCommunity {
  slug: string;
  name: string;
}

/**
 * The reader's single active community (plan_community). `active`
 * persists per-username to localStorage as a plain slug; `setActive`
 * (null) clears it. `memberships` lists the user's APPROVED communities
 * to populate the selector. Pure helpers above are unit-tested; the
 * hook just wires them to React + localStorage (no RTL in this repo).
 */
export function useActiveCommunity(username?: string | null): {
  active: string | null;
  setActive: (slug: string | null) => void;
  memberships: ApprovedCommunity[];
} {
  const [active, setActiveState] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [memberships, setMemberships] = useState<ApprovedCommunity[]>([]);

  useEffect(() => {
    try {
      setActiveState(parseActive(localStorage.getItem(activeStorageKey(username))));
    } catch {
      setActiveState(null);
    } finally {
      setHydrated(true);
    }
  }, [username]);

  useEffect(() => {
    if (!username) {
      setMemberships([]);
      return;
    }
    let cancelled = false;
    communityService
      .myApproved()
      .then((list) => {
        if (!cancelled) setMemberships(list);
      })
      .catch(() => {
        if (!cancelled) setMemberships([]);
      });
    return () => {
      cancelled = true;
    };
  }, [username]);

  const setActive = useCallback(
    (slug: string | null) => {
      setActiveState(slug);
      if (!hydrated) return;
      try {
        if (slug === null) {
          localStorage.removeItem(activeStorageKey(username));
        } else {
          localStorage.setItem(activeStorageKey(username), slug);
        }
      } catch {
        // localStorage disabled (private mode/quota) — keep in-memory.
      }
    },
    [hydrated, username],
  );

  return { active, setActive, memberships };
}
