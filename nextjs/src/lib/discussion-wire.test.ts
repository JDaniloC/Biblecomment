import { describe, it, expect } from "vitest";
import { toDiscussionWire, isEdited } from "./discussion-wire";
import type { Discussion } from "@/domain/entities/Discussion";

function baseDiscussion(partial: Partial<Discussion> = {}): Discussion {
	return {
		_id: "d1",
		bookAbbrev: "jo",
		commentId: "c1",
		username: "bob",
		verseReference: "JO 3:16",
		verseText: "",
		commentText: "texto do comentário",
		question: "corpo da discussão",
		...partial,
	};
}

describe("toDiscussionWire", () => {
	it("passes through title, quote offsets and like fields on the discussion", () => {
		const wire = toDiscussionWire(
			baseDiscussion({
				title: "Meu título",
				quoteStart: 2,
				quoteEnd: 7,
				likeCount: 4,
				likedByMe: true,
			}),
		);
		expect(wire).toMatchObject({
			title: "Meu título",
			quoteStart: 2,
			quoteEnd: 7,
			likeCount: 4,
			likedByMe: true,
		});
	});

	it("defaults title to empty string and likes to 0/false for legacy discussions", () => {
		const wire = toDiscussionWire(baseDiscussion());
		expect(wire.title).toBe("");
		expect(wire.likeCount).toBe(0);
		expect(wire.likedByMe).toBe(false);
	});

	it("maps each answer's like fields into the wire answer shape", () => {
		const wire = toDiscussionWire(
			baseDiscussion({
				answers: [
					{
						_id: "a1",
						discussionId: "d1",
						userId: "u1",
						username: "ana",
						text: "resposta",
						createdAt: new Date(),
						updatedAt: new Date(),
						likeCount: 3,
						likedByMe: true,
						authorEmailVerified: true,
					},
				],
			}),
		);
		expect(wire.answers[0]).toMatchObject({
			_id: "a1",
			name: "ana",
			text: "resposta",
			likeCount: 3,
			likedByMe: true,
			authorEmailVerified: true,
		});
	});

	it("defaults answer likes to 0/false when absent", () => {
		const wire = toDiscussionWire(
			baseDiscussion({
				answers: [
					{
						_id: "a2",
						discussionId: "d1",
						userId: "u2",
						username: "joe",
						text: "x",
						createdAt: new Date(),
						updatedAt: new Date(),
					},
				],
			}),
		);
		expect(wire.answers[0].likeCount).toBe(0);
		expect(wire.answers[0].likedByMe).toBe(false);
	});

	it("carries each answer's createdAt into the wire", () => {
		const created = new Date("2026-01-01T10:00:00Z");
		const wire = toDiscussionWire(
			baseDiscussion({
				answers: [
					{
						_id: "a1",
						discussionId: "d1",
						userId: "u1",
						username: "ana",
						text: "resposta",
						createdAt: created,
						updatedAt: created,
					},
				],
			}),
		);
		expect(wire.answers[0].createdAt).toEqual(created);
	});

	it("passes through authorEmailVerified (defaulting to false)", () => {
		expect(toDiscussionWire(baseDiscussion()).authorEmailVerified).toBe(false);
		expect(
			toDiscussionWire(baseDiscussion({ authorEmailVerified: true }))
				.authorEmailVerified,
		).toBe(true);
	});

	it("marks a discussion edited only when updatedAt is after createdAt", () => {
		const created = new Date("2024-01-01T00:00:00.000Z");
		const fresh = toDiscussionWire(
			baseDiscussion({ createdAt: created, updatedAt: created }),
		);
		expect(fresh.edited).toBe(false);

		const edited = toDiscussionWire(
			baseDiscussion({
				createdAt: created,
				updatedAt: new Date("2024-01-01T00:00:00.500Z"),
			}),
		);
		expect(edited.edited).toBe(true);
	});
});

describe("isEdited", () => {
	it("returns false when timestamps are missing", () => {
		expect(isEdited(undefined, undefined)).toBe(false);
		expect(isEdited(new Date(), undefined)).toBe(false);
		expect(isEdited(undefined, new Date())).toBe(false);
	});

	it("returns false when updatedAt equals createdAt (fresh insert)", () => {
		// Mongoose stamps both timestamps to the same value on insert.
		const created = new Date("2024-01-01T00:00:00.000Z");
		expect(isEdited(created, created)).toBe(false);
		expect(isEdited(created, new Date(created))).toBe(false);
	});

	it("returns true when updatedAt is after createdAt, even by a hair", () => {
		const created = new Date("2024-01-01T00:00:00.000Z");
		// A sub-second edit still counts — the create→edit round-trip in e2e
		// often completes in well under a second (the old >1000ms guard flaked).
		expect(isEdited(created, new Date("2024-01-01T00:00:00.500Z"))).toBe(true);
		expect(isEdited(created, new Date("2024-01-01T00:00:05.000Z"))).toBe(true);
	});

	it("accepts ISO date strings as well as Date objects", () => {
		expect(
			isEdited("2024-01-01T00:00:00.000Z", "2024-01-01T00:00:02.000Z"),
		).toBe(true);
		expect(
			isEdited("2024-01-01T00:00:00.000Z", "2024-01-01T00:00:00.000Z"),
		).toBe(false);
	});

	it("returns false for invalid date input", () => {
		expect(isEdited("not-a-date", "also-bad")).toBe(false);
	});
});
