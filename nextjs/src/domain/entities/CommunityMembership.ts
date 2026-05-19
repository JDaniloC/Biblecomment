/**
 * Join row between a user and a community.
 *
 * Stored by `User._id` and `Community._id` so renames and slug edits don't
 * cascade. Composite unique on (userId, communityId) keeps double-joins
 * idempotent.
 */
export interface CommunityMembership {
  _id?: string;
  userId: string;
  communityId: string;
  /** "pending" until a moderator approves; "approved" members are prioritized. */
  status: "pending" | "approved";
  /** "moderator" can approve requests and promote others; creator seeded as moderator. */
  role: "member" | "moderator";
  joinedAt?: Date;
}
