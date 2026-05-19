import { CommunityMembership } from "@/domain/entities/CommunityMembership";

export interface ICommunityMembershipRepository {
  /**
   * Idempotent join — returns `true` only when the row was newly created.
   * Existing memberships short-circuit so the use case knows whether to
   * bump the community's memberCount counter.
   */
  join(userId: string, communityId: string): Promise<boolean>;
  /** Returns `true` if a row was actually removed (drives counter decrement). */
  leave(userId: string, communityId: string): Promise<boolean>;
  isMember(userId: string, communityId: string): Promise<boolean>;
  /** Community._id list the user belongs to, newest-first. */
  listCommunityIdsForUser(userId: string): Promise<string[]>;
  /** Paginated member list of a community (User._id only). */
  listMemberIds(communityId: string, page: number, pageSize: number): Promise<{ items: string[]; total: number }>;
  /** Raw rows for tests / future audit views. */
  listForUser(userId: string): Promise<CommunityMembership[]>;

  // ── Moderation / prioritization (plan_community) ──
  /** Idempotent pending join request (no-op if a row already exists). */
  createRequest(userId: string, communityId: string): Promise<void>;
  listByStatus(
    communityId: string,
    status: "pending" | "approved",
  ): Promise<CommunityMembership[]>;
  setStatus(
    userId: string,
    communityId: string,
    status: "pending" | "approved",
  ): Promise<boolean>;
  remove(userId: string, communityId: string): Promise<boolean>;
  countApproved(communityId: string): Promise<number>;
  approvedUserIds(communityId: string): Promise<string[]>;
  setRole(
    userId: string,
    communityId: string,
    role: "member" | "moderator",
  ): Promise<boolean>;
  isModerator(userId: string, communityId: string): Promise<boolean>;
}
