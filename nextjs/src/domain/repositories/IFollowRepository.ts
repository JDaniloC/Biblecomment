export interface IFollowRepository {
  /**
   * Idempotent follow — returns `true` only when the row was newly created.
   * Existing relations short-circuit without writing.
   */
  follow(followerId: string, followingId: string): Promise<boolean>;
  unfollow(followerId: string, followingId: string): Promise<void>;
  isFollowing(followerId: string, followingId: string): Promise<boolean>;
  /** User._id list of accounts the follower follows. */
  listFollowingIds(followerId: string): Promise<string[]>;
  /** User._id list of accounts that follow the target. */
  listFollowerIds(userId: string): Promise<string[]>;
  countFollowers(userId: string): Promise<number>;
  countFollowing(userId: string): Promise<number>;
}
