import type { ICommunityRepository } from "@/domain/repositories/ICommunityRepository";
import type { ICommunityMembershipRepository } from "@/domain/repositories/ICommunityMembershipRepository";
import type { ICommunityFollowRepository } from "@/domain/repositories/ICommunityFollowRepository";
import type { IUserRepository } from "@/domain/repositories/IUserRepository";
import type { Community } from "@/domain/entities/Community";

/** Hard cap on communities a single user can create. Surfaced as friendly UI error in Phase 4.2. */
export const MAX_COMMUNITIES_PER_USER = 3;

export const COMMUNITY_SLUG_PATTERN = /^[a-z0-9-]{2,40}$/;

export interface CreateCommunityInput {
	actorEmail: string;
	slug: string;
	name: string;
	description?: string;
}

export class CreateCommunityUseCase {
	constructor(
		private readonly communityRepo: ICommunityRepository,
		private readonly userRepo: IUserRepository,
	) {}

	async execute(input: CreateCommunityInput): Promise<Community> {
		const actor = await this.userRepo.findByEmail(input.actorEmail);
		if (!actor || !actor._id) throw new Error("Actor not found");

		const slug = input.slug.trim().toLowerCase();
		if (!COMMUNITY_SLUG_PATTERN.test(slug)) {
			throw new Error("Invalid slug");
		}
		const name = input.name.trim();
		if (name.length < 2 || name.length > 60) throw new Error("Invalid name");
		const description = (input.description ?? "").trim();
		if (description.length > 500) throw new Error("Description too long");

		const existing = await this.communityRepo.findBySlug(slug);
		if (existing) throw new Error("Slug already in use");

		const created = await this.communityRepo.countCreatedBy(actor._id);
		if (created >= MAX_COMMUNITIES_PER_USER) {
			throw new Error("Community limit reached");
		}

		return this.communityRepo.create({
			slug,
			name,
			description,
			createdBy: actor._id,
		});
	}
}

// ── Community as prioritization profile (plan_community) ──
// Membership is request → moderator approves; the comment↔community
// association is DERIVED from approved membership (no communitySlug on
// new comments). Moderators = creator + creator-appointed.

async function assertModerator(
	memberships: ICommunityMembershipRepository,
	actorId: string,
	communityId: string,
): Promise<void> {
	if (!(await memberships.isModerator(actorId, communityId))) {
		throw new Error("Apenas moderadores");
	}
}

export class RequestJoinCommunityUseCase {
	constructor(
		private readonly communities: ICommunityRepository,
		private readonly memberships: ICommunityMembershipRepository,
	) {}
	async execute({ slug, userId }: { slug: string; userId: string }) {
		const c = await this.communities.findBySlug(slug);
		if (!c || !c._id) throw new Error("Comunidade não encontrada");
		await this.memberships.createRequest(userId, c._id);
	}
}

export class ListJoinRequestsUseCase {
	constructor(
		private readonly communities: ICommunityRepository,
		private readonly memberships: ICommunityMembershipRepository,
	) {}
	async execute({ slug, actorId }: { slug: string; actorId: string }) {
		const c = await this.communities.findBySlug(slug);
		if (!c || !c._id) throw new Error("Comunidade não encontrada");
		await assertModerator(this.memberships, actorId, c._id);
		return this.memberships.listByStatus(c._id, "pending");
	}
}

export class ApproveMemberUseCase {
	constructor(
		private readonly communities: ICommunityRepository,
		private readonly memberships: ICommunityMembershipRepository,
		// Optional so callers that don't care about the auto-follow side
		// effect (older tests) keep compiling. New code wires the follow repo
		// so an approved member is auto-followed — they presumably want their
		// own community in the selector by default.
		private readonly follows?: ICommunityFollowRepository,
	) {}
	async execute({
		slug,
		actorId,
		targetUserId,
	}: {
		slug: string;
		actorId: string;
		targetUserId: string;
	}) {
		const c = await this.communities.findBySlug(slug);
		if (!c || !c._id) throw new Error("Comunidade não encontrada");
		await assertModerator(this.memberships, actorId, c._id);
		const changed = await this.memberships.setStatus(
			targetUserId,
			c._id,
			"approved",
		);
		if (changed) await this.communities.incrementMemberCount(c._id, 1);
		// Auto-follow on approval (idempotent — `follow()` returns false when
		// the row was already there). Only bump followerCount on a fresh row.
		if (this.follows) {
			const created = await this.follows.follow(targetUserId, c._id);
			if (created) await this.communities.incrementFollowerCount(c._id, 1);
		}
	}
}

export class RejectMemberUseCase {
	constructor(
		private readonly communities: ICommunityRepository,
		private readonly memberships: ICommunityMembershipRepository,
	) {}
	async execute({
		slug,
		actorId,
		targetUserId,
	}: {
		slug: string;
		actorId: string;
		targetUserId: string;
	}) {
		const c = await this.communities.findBySlug(slug);
		if (!c || !c._id) throw new Error("Comunidade não encontrada");
		await assertModerator(this.memberships, actorId, c._id);
		await this.memberships.remove(targetUserId, c._id);
	}
}

// ── Follow (plan_community follow-up) ──────────────────────────────────
// Follow is a viewer-controlled opt-in: any signed-in user can follow
// any community, and it's the FOLLOW list (not membership) that populates
// the active-community selector. Membership stays for "whose comments
// are featured/prioritized on the community". The two are intentionally
// orthogonal — approving a member auto-creates a follow (see
// ApproveMemberUseCase) but the inverse never holds.

export class FollowCommunityUseCase {
	constructor(
		private readonly communities: ICommunityRepository,
		private readonly follows: ICommunityFollowRepository,
	) {}
	async execute({ slug, userId }: { slug: string; userId: string }) {
		const c = await this.communities.findBySlug(slug);
		if (!c || !c._id) throw new Error("Comunidade não encontrada");
		const created = await this.follows.follow(userId, c._id);
		if (created) await this.communities.incrementFollowerCount(c._id, 1);
		return { followed: true, alreadyFollowed: !created };
	}
}

export class UnfollowCommunityUseCase {
	constructor(
		private readonly communities: ICommunityRepository,
		private readonly follows: ICommunityFollowRepository,
	) {}
	async execute({ slug, userId }: { slug: string; userId: string }) {
		const c = await this.communities.findBySlug(slug);
		if (!c || !c._id) throw new Error("Comunidade não encontrada");
		const removed = await this.follows.unfollow(userId, c._id);
		if (removed) await this.communities.incrementFollowerCount(c._id, -1);
		return { followed: false, didRemove: removed };
	}
}

/** Returns the user's followed communities, newest follow first. */
export class MyFollowedCommunitiesUseCase {
	constructor(
		private readonly communities: ICommunityRepository,
		private readonly follows: ICommunityFollowRepository,
	) {}
	async execute(userId: string): Promise<Community[]> {
		const ids = await this.follows.followedCommunityIds(userId);
		if (ids.length === 0) return [];
		const list = await this.communities.findManyByIds(ids);
		// findManyByIds order is undefined; preserve the follow-recency order
		// so the most recently followed community appears first in the picker.
		const byId = new Map(list.map((c) => [c._id ?? "", c]));
		const ordered: Community[] = [];
		for (const id of ids) {
			const c = byId.get(id);
			if (c) ordered.push(c);
		}
		return ordered;
	}
}

export class MyFollowStatusUseCase {
	constructor(
		private readonly communities: ICommunityRepository,
		private readonly follows: ICommunityFollowRepository,
	) {}
	async execute({ slug, userId }: { slug: string; userId: string }) {
		const c = await this.communities.findBySlug(slug);
		if (!c || !c._id) return { following: false };
		return { following: await this.follows.isFollowing(userId, c._id) };
	}
}

export class SetModeratorUseCase {
	constructor(
		private readonly communities: ICommunityRepository,
		private readonly memberships: ICommunityMembershipRepository,
	) {}
	async execute({
		slug,
		actorId,
		targetUserId,
		makeModerator,
	}: {
		slug: string;
		actorId: string;
		targetUserId: string;
		makeModerator: boolean;
	}) {
		const c = await this.communities.findBySlug(slug);
		if (!c || !c._id) throw new Error("Comunidade não encontrada");
		if (c.createdBy !== actorId) {
			throw new Error("Apenas o criador gerencia moderadores");
		}
		await this.memberships.setRole(
			targetUserId,
			c._id,
			makeModerator ? "moderator" : "member",
		);
	}
}
