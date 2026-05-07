export interface DiscussionAnswer {
  _id?: string;
  discussionId: string;
  userId: string;
  /**
   * Username snapshot at answer time. Kept denormalized so the discussion
   * GET can render "bob respondeu" without a User join. On user delete the
   * cascade rewrites this to "[usuário removido]" — the answer text stays.
   */
  username: string;
  text: string;
  createdAt: Date;
  updatedAt: Date;
}
