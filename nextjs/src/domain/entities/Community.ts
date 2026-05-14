/**
 * Public community a user can create and others can join.
 *
 * `memberCount` is denormalized for cheap rendering on the listing page —
 * the repo keeps it in sync via $inc on join/leave. Truth lives in the
 * CommunityMembership collection if the counter ever drifts.
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
  createdAt?: Date;
  updatedAt?: Date;
}
