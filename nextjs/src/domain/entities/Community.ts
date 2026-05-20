/**
 * Public community a user can create and others can join.
 *
 * Two viewer-facing counters, both denormalized for cheap rendering:
 *  - `memberCount` — approved memberships; bumped on approve/leave.
 *  - `followerCount` — viewer opt-ins; bumped on follow/unfollow.
 * Truth lives in the join collections (CommunityMembership /
 * CommunityFollow) — the migration script reconciles both if a counter
 * ever drifts.
 *
 * `createdBy` is the creator's `User._id` (not username), keeping the
 * foreign key stable across username changes — same convention as Follow.
 */
export interface Community {
	_id?: string;
	slug: string;
	name: string;
	description: string;
	createdBy: string;
	memberCount: number;
	followerCount: number;
	createdAt?: Date;
	updatedAt?: Date;
}
