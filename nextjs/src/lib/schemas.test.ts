import { describe, it, expect } from "vitest";
import { CreateDiscussionSchema } from "./schemas";

const valid = { commentId: "c1", title: "Título", body: "Corpo da discussão" };

describe("CreateDiscussionSchema", () => {
  it("accepts a valid payload with optional quote offsets", () => {
    const r = CreateDiscussionSchema.safeParse({ ...valid, quoteStart: 0, quoteEnd: 5 });
    expect(r.success).toBe(true);
  });

  it("accepts a valid payload without quote offsets", () => {
    const r = CreateDiscussionSchema.safeParse(valid);
    expect(r.success).toBe(true);
  });

  it("rejects a payload without commentId", () => {
    const r = CreateDiscussionSchema.safeParse({ title: "t", body: "b" });
    expect(r.success).toBe(false);
  });

  it("rejects an empty title", () => {
    const r = CreateDiscussionSchema.safeParse({ ...valid, title: "" });
    expect(r.success).toBe(false);
  });

  it("rejects a body longer than 1000 characters", () => {
    const r = CreateDiscussionSchema.safeParse({ ...valid, body: "a".repeat(1001) });
    expect(r.success).toBe(false);
  });
});
