import { describe, it, expect } from "vitest";
import { parseMentions } from "./mentions";

describe("parseMentions", () => {
  it("returns empty array for empty input", () => {
    expect(parseMentions("")).toEqual([]);
  });

  it("returns empty array when no mentions", () => {
    expect(parseMentions("Just a regular comment with no mentions")).toEqual([]);
  });

  it("extracts a single mention", () => {
    expect(parseMentions("Hello @alice, how are you?")).toEqual(["alice"]);
  });

  it("extracts multiple mentions", () => {
    expect(parseMentions("@alice and @bob should see this")).toEqual(["alice", "bob"]);
  });

  it("deduplicates repeated mentions", () => {
    expect(parseMentions("@alice @alice @alice")).toEqual(["alice"]);
  });

  it("ignores email addresses (no @ at start of word)", () => {
    expect(parseMentions("Reach me at user@example.com")).toEqual([]);
  });

  it("ignores @ followed by too few characters", () => {
    expect(parseMentions("@a is too short")).toEqual([]);
  });

  it("matches mentions at the start of the text", () => {
    expect(parseMentions("@alice you should see this")).toEqual(["alice"]);
  });

  it("matches mentions after punctuation", () => {
    expect(parseMentions("Hi, @alice. And @bob, hello!")).toEqual(["alice", "bob"]);
  });

  it("supports underscores and hyphens in usernames", () => {
    expect(parseMentions("@john_doe and @mary-jane")).toEqual(["john_doe", "mary-jane"]);
  });

  it("does not match @username inside another @username", () => {
    expect(parseMentions("@alice@bob @carol")).toEqual(["alice", "carol"]);
  });

  it("matches the first 40 characters of an over-long username", () => {
    const long = "a".repeat(45);
    expect(parseMentions(`@${long}`)).toEqual(["a".repeat(40)]);
  });
});
