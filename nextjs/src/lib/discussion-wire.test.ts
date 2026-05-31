import { describe, it, expect } from "vitest";
import { toDiscussionWire } from "./discussion-wire";
import type { Discussion } from "@/domain/entities/Discussion";

function baseDiscussion(partial: Partial<Discussion> = {}): Discussion {
	return {
		_id: "d1",
		bookAbbrev: "jo",
		commentId: "c1",
		username: "bob",
		verseReference: "JO 3:16",
		verseText: "",
		commentText: "texto do comentÃ¡rio",
		question: "corpo da discussÃ£o",
		...partial,
	};
}

describe("toDiscussionWire", () => {
	it("passes through title, quote offsets and like fields on the discussion", () => {
		const wire = toDiscussionWire(
			baseDiscussion({
				title: "Meu tÃ­tulo",
				quoteStart: 2,
				quoteEnd: 7,
				likeCount: 4,
				likedByMe: true,
			}),
		);
		expect(wire).toMatchObject({
			title: "Meu tÃ­tulo",
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
});
