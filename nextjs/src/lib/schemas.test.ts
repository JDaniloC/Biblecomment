import { describe, it, expect } from "vitest";
import { CreateDiscussionSchema } from "./schemas";

const valid = {
	commentId: "c1",
	title: "TÃ­tulo",
	body: "Corpo da discussÃ£o",
};

describe("CreateDiscussionSchema", () => {
	it("accepts a valid payload with optional quote offsets", () => {
		const result = CreateDiscussionSchema.safeParse({
			...valid,
			quoteStart: 0,
			quoteEnd: 5,
		});
		expect(result.success).toBe(true);
	});

	it("accepts a valid payload without quote offsets", () => {
		const result = CreateDiscussionSchema.safeParse(valid);
		expect(result.success).toBe(true);
	});

	it("rejects a payload without commentId", () => {
		const result = CreateDiscussionSchema.safeParse({ title: "t", body: "b" });
		expect(result.success).toBe(false);
	});

	it("rejects an empty title", () => {
		const result = CreateDiscussionSchema.safeParse({ ...valid, title: "" });
		expect(result.success).toBe(false);
	});

	it("rejects a body longer than 1000 characters", () => {
		const result = CreateDiscussionSchema.safeParse({
			...valid,
			body: "a".repeat(1001),
		});
		expect(result.success).toBe(false);
	});
});
