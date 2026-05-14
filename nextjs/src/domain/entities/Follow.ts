/**
 * Directed follow relation between two users.
 *
 * Stored by `User._id` rather than `username` so that the user-rename
 * cascade in UpdateUsernameUseCase doesn't need to touch this collection —
 * the foreign key is stable across slug changes.
 */
export interface Follow {
  _id?: string;
  followerId: string;
  followingId: string;
  createdAt?: Date;
}
