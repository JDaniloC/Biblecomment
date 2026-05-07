export interface CommentReport {
  _id?: string;
  userId: string;
  /**
   * Username snapshot at report time. Kept denormalized so the moderation
   * panel can render "Reportado por: alice, bob" without an extra User
   * lookup. Stale renames are not a concern (no rename flow); on user
   * delete the cascade drops the row entirely.
   */
  username: string;
  commentId: string;
  createdAt: Date;
}
