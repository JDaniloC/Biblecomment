/**
 * Snapshot of a user that is safe to send to any client — anonymous or
 * authenticated. Excludes email, state, moderator flag, tutorial progress,
 * and the password hash by construction. `belief` is only populated when
 * the user has opted in via the `showBelief` flag in /profile.
 */
export interface PublicUserDTO {
  username: string;
  displayName?: string;
  badges: string[];
  belief?: string;
  /** Derived from `emailVerifiedAt` on the User. Never expose the date itself publicly. */
  emailVerified: boolean;
  createdAt: Date;
}
