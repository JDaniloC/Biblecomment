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
  joinedAt?: Date;
}
