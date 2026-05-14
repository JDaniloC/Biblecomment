import type { ICommunityRepository } from "@/domain/repositories/ICommunityRepository";
import type { ICommunityMembershipRepository } from "@/domain/repositories/ICommunityMembershipRepository";
import type { IUserRepository } from "@/domain/repositories/IUserRepository";
import type { Community } from "@/domain/entities/Community";

/** Hard cap on communities a single user can create. Surfaced as friendly UI error in Phase 4.2. */
export const MAX_COMMUNITIES_PER_USER = 3;

export const COMMUNITY_SLUG_PATTERN = /^[a-z0-9-]{2,40}$/;

export interface CreateCommunityInput {
  actorEmail: string;
  slug: string;
  name: string;
  description?: string;
}

export class CreateCommunityUseCase {
  constructor(
    private readonly communityRepo: ICommunityRepository,
    private readonly userRepo: IUserRepository,
  ) {}

  async execute(input: CreateCommunityInput): Promise<Community> {
    const actor = await this.userRepo.findByEmail(input.actorEmail);
    if (!actor || !actor._id) throw new Error("Actor not found");

    const slug = input.slug.trim().toLowerCase();
    if (!COMMUNITY_SLUG_PATTERN.test(slug)) {
      throw new Error("Invalid slug");
    }
    const name = input.name.trim();
    if (name.length < 2 || name.length > 60) throw new Error("Invalid name");
    const description = (input.description ?? "").trim();
    if (description.length > 500) throw new Error("Description too long");

    const existing = await this.communityRepo.findBySlug(slug);
    if (existing) throw new Error("Slug already in use");

    const created = await this.communityRepo.countCreatedBy(actor._id);
    if (created >= MAX_COMMUNITIES_PER_USER) {
      throw new Error("Community limit reached");
    }

    return this.communityRepo.create({
      slug,
      name,
      description,
      createdBy: actor._id,
    });
  }
}

export class JoinCommunityUseCase {
  constructor(
    private readonly communityRepo: ICommunityRepository,
    private readonly membershipRepo: ICommunityMembershipRepository,
    private readonly userRepo: IUserRepository,
  ) {}

  async execute(actorEmail: string, slug: string): Promise<{ joined: boolean }> {
    const [actor, community] = await Promise.all([
      this.userRepo.findByEmail(actorEmail),
      this.communityRepo.findBySlug(slug),
    ]);
    if (!actor || !actor._id) throw new Error("Actor not found");
    if (!community || !community._id) throw new Error("Community not found");

    const joined = await this.membershipRepo.join(actor._id, community._id);
    // Only bump the denormalized counter when the membership is fresh; the
    // repo's join() short-circuits duplicates so this can't double-count.
    if (joined) await this.communityRepo.incrementMemberCount(community._id, 1);
    return { joined };
  }
}

export class LeaveCommunityUseCase {
  constructor(
    private readonly communityRepo: ICommunityRepository,
    private readonly membershipRepo: ICommunityMembershipRepository,
    private readonly userRepo: IUserRepository,
  ) {}

  async execute(actorEmail: string, slug: string): Promise<{ left: boolean }> {
    const [actor, community] = await Promise.all([
      this.userRepo.findByEmail(actorEmail),
      this.communityRepo.findBySlug(slug),
    ]);
    if (!actor || !actor._id) throw new Error("Actor not found");
    if (!community || !community._id) throw new Error("Community not found");

    const left = await this.membershipRepo.leave(actor._id, community._id);
    if (left) await this.communityRepo.incrementMemberCount(community._id, -1);
    return { left };
  }
}
