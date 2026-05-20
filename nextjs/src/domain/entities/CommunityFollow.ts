/**
 * plan_community follow-up: "follow a community" is a viewer-controlled
 * opt-in, distinct from `CommunityMembership` (which is moderated and
 * drives whose comments get prioritized in the reader). A follow only
 * grants the community a slot in the user's active-community selector.
 */
export interface CommunityFollow {
  _id?: string;
  userId: string;
  communityId: string;
  followedAt?: Date;
}
