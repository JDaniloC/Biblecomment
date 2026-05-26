import { describe, it, expect } from "vitest";
import { isEmailVerified } from "./auth-guards";
import type { User } from "@/domain/entities/User";

function u(o: Partial<User> = {}): User {
  return { _id: "u1", email: "a@b.c", username: "a", password: "h", ...o };
}

describe("isEmailVerified", () => {
  it("returns false when emailVerifiedAt is absent", () => {
    expect(isEmailVerified(u())).toBe(false);
  });
  it("returns true when emailVerifiedAt is set", () => {
    expect(isEmailVerified(u({ emailVerifiedAt: new Date() }))).toBe(true);
  });
  it("returns false for null", () => {
    expect(isEmailVerified(null)).toBe(false);
  });
});
