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
    commentText: "texto do comentário",
    question: "corpo da discussão",
    ...partial,
  };
}

describe("toDiscussionWire", () => {
  it("passes through title, quote offsets and like fields on the discussion", () => {
    const w = toDiscussionWire(
      baseDiscussion({
        title: "Meu título",
        quoteStart: 2,
        quoteEnd: 7,
        likeCount: 4,
        likedByMe: true,
      }),
    );
    expect(w).toMatchObject({
      title: "Meu título",
      quoteStart: 2,
      quoteEnd: 7,
      likeCount: 4,
      likedByMe: true,
    });
  });

  it("defaults title to empty string and likes to 0/false for legacy discussions", () => {
    const w = toDiscussionWire(baseDiscussion());
    expect(w.title).toBe("");
    expect(w.likeCount).toBe(0);
    expect(w.likedByMe).toBe(false);
  });

  it("maps each answer's like fields into the wire answer shape", () => {
    const w = toDiscussionWire(
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
    expect(w.answers[0]).toMatchObject({
      _id: "a1",
      name: "ana",
      text: "resposta",
      likeCount: 3,
      likedByMe: true,
      authorEmailVerified: true,
    });
  });

  it("defaults answer likes to 0/false when absent", () => {
    const w = toDiscussionWire(
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
    expect(w.answers[0].likeCount).toBe(0);
    expect(w.answers[0].likedByMe).toBe(false);
  });
});
