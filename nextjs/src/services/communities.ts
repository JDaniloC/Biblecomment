"use client";

import type { Community } from "@/domain/entities/Community";

async function parseError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    return body?.error ?? `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

export interface ListCommunitiesResponse {
  items: Community[];
  total: number;
  page: number;
  pageSize: number;
}

export const communityService = {
  async list(params: { page?: number; q?: string } = {}): Promise<ListCommunitiesResponse> {
    const qs = new URLSearchParams();
    if (params.page) qs.set("page", String(params.page));
    if (params.q && params.q.trim().length > 0) qs.set("q", params.q.trim());
    const url = `/api/communities${qs.size ? `?${qs}` : ""}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(await parseError(res));
    return (await res.json()) as ListCommunitiesResponse;
  },

  async join(slug: string): Promise<void> {
    const res = await fetch(`/api/communities/${slug}/join`, { method: "POST" });
    if (!res.ok) throw new Error(await parseError(res));
  },

  async leave(slug: string): Promise<void> {
    const res = await fetch(`/api/communities/${slug}/join`, { method: "DELETE" });
    if (!res.ok) throw new Error(await parseError(res));
  },

  /** The signed-in user's APPROVED communities (active-community selector). */
  async myApproved(): Promise<{ slug: string; name: string }[]> {
    const res = await fetch("/api/communities/mine");
    if (!res.ok) throw new Error(await parseError(res));
    const body = (await res.json()) as {
      communities: { slug: string; name: string }[];
    };
    return body.communities ?? [];
  },
};
