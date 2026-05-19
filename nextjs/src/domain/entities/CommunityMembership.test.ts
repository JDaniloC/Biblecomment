import { describe, it, expect } from "vitest";
import type { CommunityMembership } from "./CommunityMembership";

describe("CommunityMembership entity", () => {
  it("supports status and role fields", () => {
    const m: CommunityMembership = {
      userId: "u1",
      communityId: "c1",
      status: "pending",
      role: "member",
      joinedAt: new Date(),
    };
    expect(m.status).toBe("pending");
    expect(m.role).toBe("member");
  });
});
