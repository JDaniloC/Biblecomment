/**
 * Stateful in-memory community repositories for use-case tests. Shared by
 * CommunityUseCases.test.ts and the account-deletion tests in
 * UserUseCases.test.ts, which need real counters and membership state.
 */
import type { ICommunityRepository } from "@/domain/repositories/ICommunityRepository";
import type { ICommunityMembershipRepository } from "@/domain/repositories/ICommunityMembershipRepository";
import type { ICommunityFollowRepository } from "@/domain/repositories/ICommunityFollowRepository";
import type { Community } from "@/domain/entities/Community";
import type { CommunityMembership } from "@/domain/entities/CommunityMembership";
import type { CommunityFollow } from "@/domain/entities/CommunityFollow";

export function makeCommunityRepo(): ICommunityRepository & {
	_items: Map<string, Community>;
} {
	const items = new Map<string, Community>();
	let nextId = 1;
	return {
		_items: items,
		async create(input) {
			const c: Community = {
				_id: `c-${nextId++}`,
				slug: input.slug,
				name: input.name,
				description: input.description,
				createdBy: input.createdBy,
				memberCount: 0,
				followerCount: 0,
				createdAt: new Date(),
			};
			items.set(c._id!, c);
			return c;
		},
		async findById(id) {
			return items.get(id) ?? null;
		},
		async findBySlug(slug) {
			return Array.from(items.values()).find((c) => c.slug === slug) ?? null;
		},
		async list() {
			return { items: Array.from(items.values()), total: items.size };
		},
		async countCreatedBy(userId) {
			return Array.from(items.values()).filter((c) => c.createdBy === userId)
				.length;
		},
		async listCreatedBy(userId) {
			return Array.from(items.values()).filter((c) => c.createdBy === userId);
		},
		async setCreatedBy(id, userId) {
			const c = items.get(id);
			if (c) c.createdBy = userId;
		},
		async setCounters(id, counters) {
			const c = items.get(id);
			if (c) Object.assign(c, counters);
		},
		async findManyByIds(ids) {
			return ids.map((id) => items.get(id)).filter((x): x is Community => !!x);
		},
		async incrementMemberCount(id, delta) {
			const c = items.get(id);
			if (c) c.memberCount += delta;
		},
		async incrementFollowerCount(id, delta) {
			const c = items.get(id);
			if (c) c.followerCount += delta;
		},
		// Fake repo must match the async interface signature even though
		// the in-memory Map ops are sync — skip DeepSource JS-0116 here.
		// skipcq: JS-0116
		async deleteById(id) {
			return items.delete(id);
		},
	};
}

export function makeFollowRepo(): ICommunityFollowRepository & {
	_rows: Map<string, Date>;
} {
	const rows = new Map<string, Date>();
	const key = (u: string, c: string) => `${u}::${c}`;
	return {
		_rows: rows,
		async follow(userId, communityId) {
			const k = key(userId, communityId);
			if (rows.has(k)) return false;
			rows.set(k, new Date());
			return true;
		},
		async unfollow(userId, communityId) {
			return rows.delete(key(userId, communityId));
		},
		async isFollowing(userId, communityId) {
			return rows.has(key(userId, communityId));
		},
		async followedCommunityIds(userId) {
			return (
				[...rows.entries()]
					.filter(([k]) => k.startsWith(`${userId}::`))
					// Newest follow first — sort by followedAt desc to mirror Mongo.
					.sort((a, b) => b[1].getTime() - a[1].getTime())
					.map(([k]) => k.split("::")[1])
			);
		},
		async listForUser(userId) {
			return [...rows.entries()]
				.filter(([k]) => k.startsWith(`${userId}::`))
				.map(
					([k, t]): CommunityFollow => ({
						userId: k.split("::")[0],
						communityId: k.split("::")[1],
						followedAt: t,
					}),
				);
		},
		async listByCommunity(communityId) {
			return [...rows.entries()]
				.filter(([k]) => k.endsWith(`::${communityId}`))
				.sort((a, b) => b[1].getTime() - a[1].getTime())
				.map(
					([k, t]): CommunityFollow => ({
						userId: k.split("::")[0],
						communityId: k.split("::")[1],
						followedAt: t,
					}),
				);
		},
		async countByCommunity(communityId) {
			return [...rows.keys()].filter((k) => k.endsWith(`::${communityId}`))
				.length;
		},
		async removeAllByUser(userId) {
			const prev = rows.size;
			[...rows.keys()]
				.filter((k) => k.startsWith(`${userId}::`))
				.forEach((k) => rows.delete(k));
			return prev - rows.size;
		},
		async removeAllByCommunity(communityId) {
			const prev = rows.size;
			[...rows.keys()]
				.filter((k) => k.endsWith(`::${communityId}`))
				.forEach((k) => rows.delete(k));
			return prev - rows.size;
		},
	};
}

export type MembershipRow = { status: "pending" | "approved"; role: "member" | "moderator" };

export function makeMembershipRepo(): ICommunityMembershipRepository & {
	_rows: Map<string, MembershipRow>;
} {
	const rows = new Map<string, MembershipRow>();
	const key = (u: string, c: string) => `${u}::${c}`;
	const split = (k: string) => k.split("::");
	return {
		_rows: rows,
		async join(userId, communityId) {
			const k = key(userId, communityId);
			if (rows.has(k)) return false;
			rows.set(k, { status: "approved", role: "member" });
			return true;
		},
		async leave(userId, communityId) {
			return rows.delete(key(userId, communityId));
		},
		async isMember(userId, communityId) {
			return rows.has(key(userId, communityId));
		},
		async listCommunityIdsForUser(userId) {
			return [...rows.keys()]
				.filter((k) => k.startsWith(`${userId}::`))
				.map((k) => split(k)[1]);
		},
		async listMemberIds(communityId, page, pageSize) {
			const all = [...rows.keys()]
				.filter((k) => k.endsWith(`::${communityId}`))
				.map((k) => split(k)[0]);
			const start = (page - 1) * pageSize;
			return { items: all.slice(start, start + pageSize), total: all.length };
		},
		async listForUser(userId) {
			return [...rows.entries()]
				.filter(([k]) => k.startsWith(`${userId}::`))
				.map(([k, v]): CommunityMembership => {
					const [u, c] = split(k);
					return { userId: u, communityId: c, ...v };
				});
		},
		async createRequest(userId, communityId) {
			const k = key(userId, communityId);
			if (!rows.has(k)) rows.set(k, { status: "pending", role: "member" });
		},
		async seedCreator(userId, communityId) {
			rows.set(key(userId, communityId), {
				status: "approved",
				role: "moderator",
			});
		},
		async listByStatus(communityId, status) {
			return [...rows.entries()]
				.filter(
					([k, v]) => k.endsWith(`::${communityId}`) && v.status === status,
				)
				.map(([k, v]): CommunityMembership => {
					const [u, c] = split(k);
					return { userId: u, communityId: c, ...v };
				});
		},
		async setStatus(userId, communityId, status) {
			const r = rows.get(key(userId, communityId));
			if (!r || r.status === status) return false;
			r.status = status;
			return true;
		},
		async remove(userId, communityId) {
			return rows.delete(key(userId, communityId));
		},
		async removeReturningStatus(userId, communityId) {
			const r = rows.get(key(userId, communityId));
			if (!r) return null;
			rows.delete(key(userId, communityId));
			return r.status;
		},
		async removePending(userId, communityId) {
			const r = rows.get(key(userId, communityId));
			if (r?.status !== "pending") return false;
			return rows.delete(key(userId, communityId));
		},
		async removeAllByUser(userId) {
			const before = rows.size;
			[...rows.keys()]
				.filter((k) => k.startsWith(`${userId}::`))
				.forEach((k) => rows.delete(k));
			return before - rows.size;
		},
		// Map insertion order stands in for joinedAt.
		async listApprovedOrdered(communityId) {
			const approved = [...rows.entries()]
				.filter(
					([k, v]) => k.endsWith(`::${communityId}`) && v.status === "approved",
				)
				.map(([k, v]): CommunityMembership => {
					const [u, c] = split(k);
					return { userId: u, communityId: c, ...v };
				});
			return [
				...approved.filter((m) => m.role === "moderator"),
				...approved.filter((m) => m.role !== "moderator"),
			];
		},
		async getStatus(userId, communityId) {
			const r = rows.get(key(userId, communityId));
			return r ? r.status : null;
		},
		async findOne(userId, communityId) {
			const r = rows.get(key(userId, communityId));
			if (!r) return null;
			return { userId, communityId, ...r };
		},
		async countApproved(communityId) {
			return [...rows.entries()].filter(
				([k, v]) => k.endsWith(`::${communityId}`) && v.status === "approved",
			).length;
		},
		async approvedUserIds(communityId) {
			return [...rows.entries()]
				.filter(
					([k, v]) => k.endsWith(`::${communityId}`) && v.status === "approved",
				)
				.map(([k]) => split(k)[0]);
		},
		async setRole(userId, communityId, role) {
			const r = rows.get(key(userId, communityId));
			if (!r || r.role === role) return false;
			r.role = role;
			return true;
		},
		async isModerator(userId, communityId) {
			const r = rows.get(key(userId, communityId));
			return Boolean(r) && r?.role === "moderator" && r?.status === "approved";
		},
		// Async signature is interface-mandated — skip JS-0116.
		// skipcq: JS-0116
		async removeAllByCommunity(communityId) {
			const before = rows.size;
			[...rows.keys()]
				.filter((k) => k.endsWith(`::${communityId}`))
				.forEach((k) => rows.delete(k));
			return before - rows.size;
		},
	};
}
