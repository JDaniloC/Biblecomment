import { describe, it, expect } from "vitest";
import {
  sanitizeUsername,
  isValidUsername,
  isReservedUsername,
  RESERVED_USERNAMES,
} from "./sanitize-username";

describe("sanitizeUsername", () => {
  it("lowercases ASCII", () => {
    expect(sanitizeUsername("Felipe")).toBe("felipe");
  });

  it("strips diacritics", () => {
    expect(sanitizeUsername("João")).toBe("joao");
    expect(sanitizeUsername("MARÍA")).toBe("maria");
    expect(sanitizeUsername("São José")).toBe("sao-jose");
  });

  it("collapses internal whitespace into one hyphen", () => {
    expect(sanitizeUsername("João  Daniel")).toBe("joao-daniel");
    expect(sanitizeUsername("a b c")).toBe("a-b-c");
  });

  it("trims leading/trailing hyphens and underscores", () => {
    expect(sanitizeUsername("  felipe  ")).toBe("felipe");
    expect(sanitizeUsername("---felipe---")).toBe("felipe");
    expect(sanitizeUsername("__felipe__")).toBe("felipe");
  });

  it("preserves underscore in the middle", () => {
    expect(sanitizeUsername("john_doe")).toBe("john_doe");
  });

  it("replaces any non-alphanumeric with a hyphen", () => {
    expect(sanitizeUsername("user@host")).toBe("user-host");
    expect(sanitizeUsername("a/b\\c")).toBe("a-b-c");
    expect(sanitizeUsername("hello!world")).toBe("hello-world");
  });

  it("truncates to MAX length", () => {
    const longName = "a".repeat(80);
    expect(sanitizeUsername(longName)).toHaveLength(40);
  });

  it("returns empty for entirely non-alphanumeric input", () => {
    expect(sanitizeUsername("!@#$%^")).toBe("");
    expect(sanitizeUsername("")).toBe("");
    expect(sanitizeUsername("   ")).toBe("");
  });

  it("preserves digits", () => {
    expect(sanitizeUsername("user123")).toBe("user123");
    expect(sanitizeUsername("123user")).toBe("123user");
  });
});

describe("isValidUsername", () => {
  it("accepts the canonical form", () => {
    expect(isValidUsername("felipe")).toBe(true);
    expect(isValidUsername("user_123")).toBe(true);
    expect(isValidUsername("a-b")).toBe(true);
  });

  it("rejects too short", () => {
    expect(isValidUsername("a")).toBe(false);
    expect(isValidUsername("")).toBe(false);
  });

  it("rejects uppercase", () => {
    expect(isValidUsername("Felipe")).toBe(false);
  });

  it("rejects spaces", () => {
    expect(isValidUsername("a b")).toBe(false);
  });

  it("rejects special chars", () => {
    expect(isValidUsername("a@b")).toBe(false);
    expect(isValidUsername("a.b")).toBe(false);
  });

  it("rejects reserved sentinel names", () => {
    expect(isValidUsername("system")).toBe(false);
    expect(isValidUsername("deleted-user")).toBe(false);
  });

  it("accepts names that merely contain a reserved word", () => {
    expect(isValidUsername("system-2")).toBe(true);
    expect(isValidUsername("systems")).toBe(true);
    expect(isValidUsername("deleted-user-2")).toBe(true);
  });
});

describe("isReservedUsername", () => {
  it("flags every RESERVED_USERNAMES entry", () => {
    for (const name of RESERVED_USERNAMES) {
      expect(isReservedUsername(name)).toBe(true);
    }
    expect(RESERVED_USERNAMES.has("system")).toBe(true);
    expect(RESERVED_USERNAMES.has("deleted-user")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isReservedUsername("System")).toBe(true);
    expect(isReservedUsername("DELETED-USER")).toBe(true);
  });

  it("does not flag ordinary names", () => {
    expect(isReservedUsername("felipe")).toBe(false);
    expect(isReservedUsername("system-2")).toBe(false);
  });

  it("is what a display name of a sentinel sanitizes to", () => {
    expect(isReservedUsername(sanitizeUsername("System"))).toBe(true);
    expect(isReservedUsername(sanitizeUsername("Deleted User"))).toBe(true);
  });
});
