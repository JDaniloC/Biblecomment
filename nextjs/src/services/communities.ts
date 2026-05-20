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
	async list(
		params: { page?: number; q?: string } = {},
	): Promise<ListCommunitiesResponse> {
		const qs = new URLSearchParams();
		if (params.page) qs.set("page", String(params.page));
		if (params.q && params.q.trim().length > 0) qs.set("q", params.q.trim());
		const url = `/api/communities${qs.size ? `?${qs}` : ""}`;
		const res = await fetch(url);
		if (!res.ok) throw new Error(await parseError(res));
		return (await res.json()) as ListCommunitiesResponse;
	},

	// `join` / `leave` removed — `requestJoin` and `cancelOrLeave` cover
	// the same routes with names that match the plan_community lifecycle
	// (request → moderator approves → leave). Having both pairs was an
	// API hazard flagged by the Copilot review on PR #205.

	/**
	 * The signed-in user's FOLLOWED communities (active-community selector
	 * options). plan_community follow-up: follow is a viewer opt-in,
	 * separate from membership. The URL stays `/mine` for back-compat with
	 * the existing route — only the semantics changed.
	 */
	async myFollowed(): Promise<{ slug: string; name: string }[]> {
		const res = await fetch("/api/communities/mine");
		if (!res.ok) throw new Error(await parseError(res));
		const body = (await res.json()) as {
			communities: { slug: string; name: string }[];
		};
		return body.communities ?? [];
	},

	async follow(slug: string): Promise<void> {
		const res = await fetch(`/api/communities/${slug}/follow`, {
			method: "POST",
		});
		if (!res.ok) throw new Error(await parseError(res));
	},

	async unfollow(slug: string): Promise<void> {
		const res = await fetch(`/api/communities/${slug}/follow`, {
			method: "DELETE",
		});
		if (!res.ok) throw new Error(await parseError(res));
	},

	async myFollowStatus(slug: string): Promise<{ following: boolean }> {
		const res = await fetch(`/api/communities/${slug}/follow/me`);
		if (!res.ok) throw new Error(await parseError(res));
		return res.json();
	},

	// ── plan_community moderation flows ──

	async myStatus(slug: string): Promise<{
		status: "none" | "pending" | "approved";
		role: "member" | "moderator";
	}> {
		const res = await fetch(`/api/communities/${slug}/membership/me`);
		if (!res.ok) throw new Error(await parseError(res));
		return res.json();
	},

	async requestJoin(slug: string): Promise<void> {
		const res = await fetch(`/api/communities/${slug}/join`, {
			method: "POST",
		});
		if (!res.ok) throw new Error(await parseError(res));
	},

	/** Cancel a pending request, or leave an approved membership. */
	async cancelOrLeave(slug: string): Promise<void> {
		const res = await fetch(`/api/communities/${slug}/join`, {
			method: "DELETE",
		});
		if (!res.ok) throw new Error(await parseError(res));
	},

	async listMembers(slug: string): Promise<
		{
			userId: string;
			username: string | null;
			role: "member" | "moderator";
			isCreator: boolean;
			joinedAt: string | null;
		}[]
	> {
		const res = await fetch(`/api/communities/${slug}/members`);
		if (!res.ok) throw new Error(await parseError(res));
		const body = (await res.json()) as {
			members: {
				userId: string;
				username: string | null;
				role: "member" | "moderator";
				isCreator: boolean;
				joinedAt: string | null;
			}[];
		};
		return body.members ?? [];
	},

	async listRequests(
		slug: string,
	): Promise<{ userId: string; username: string | null; joinedAt?: string }[]> {
		const res = await fetch(`/api/communities/${slug}/requests`);
		if (!res.ok) throw new Error(await parseError(res));
		const body = (await res.json()) as {
			requests: {
				userId: string;
				username: string | null;
				joinedAt?: string;
			}[];
		};
		return body.requests ?? [];
	},

	/**
	 * `changed` is true only when the membership status flipped from
	 * pending → approved. The community page uses it to avoid drifting
	 * the optimistic memberCount when a moderator double-clicks Aprovar
	 * on a row that was already approved.
	 */
	async approve(
		slug: string,
		userId: string,
	): Promise<{ changed: boolean }> {
		const res = await fetch(`/api/communities/${slug}/requests/${userId}`, {
			method: "POST",
		});
		if (!res.ok) throw new Error(await parseError(res));
		const body = (await res.json().catch(() => ({}))) as { changed?: boolean };
		return { changed: body.changed ?? true };
	},

	async reject(slug: string, userId: string): Promise<void> {
		const res = await fetch(`/api/communities/${slug}/requests/${userId}`, {
			method: "DELETE",
		});
		if (!res.ok) throw new Error(await parseError(res));
	},

	async setModerator(
		slug: string,
		userId: string,
		makeModerator: boolean,
	): Promise<void> {
		const res = await fetch(`/api/communities/${slug}/moderators/${userId}`, {
			method: makeModerator ? "POST" : "DELETE",
		});
		if (!res.ok) throw new Error(await parseError(res));
	},
};
