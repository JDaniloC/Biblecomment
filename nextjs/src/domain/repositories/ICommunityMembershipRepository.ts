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
}
