/**
 * @username mention parsing → notification creation.
 *
 * The parser is unit-tested (parseMentions, 12 cases) and so is
 * NotifyMentionsUseCase (4 cases). This spec exercises the wire-up
 * inside the comment-create + answer-add routes against real Mongo.
 */

import users from "../fixtures/users.json";
import bookFixture from "../fixtures/book-gn.json";

function getVerseId(
  abbrev: string,
  chapter: number,
  verseNumber: number,
): Cypress.Chainable<string> {
  return cy.request("GET", `/api/books/${abbrev}/verses/${chapter}`).then((res) => {
    const verse = (res.body as Array<{ _id: string; verseNumber: number }>).find(
      (v) => v.verseNumber === verseNumber,
    );
    expect(verse, `verse ${abbrev} ${chapter}:${verseNumber} should be seeded`).to.exist;
    return verse!._id;
  });
}

describe("@mentions", () => {
  beforeEach(() => {
    cy.resetDb();
    cy.seedDb({
      users: [users.alice, users.bob, users.mod],
      books: [bookFixture.book],
      verses: bookFixture.verses,
    });
  });

  describe("In comments", () => {
    it("@bob in alice's comment creates exactly one notification for bob", () => {
      cy.loginAs(users.alice.email, users.alice.password);
      getVerseId("gn", 1, 1).then((verseId) => {
        cy.request({
          method: "POST",
          url: `/api/comments/${verseId}`,
          body: { text: "Olá @bob, o que você acha?", tags: [] },
        }).then((res) => {
          expect(res.status).to.eq(201);
        });
      });

      cy.clearCookies();
      cy.loginAs(users.bob.email, users.bob.password);
      cy.request("/api/notifications").then((res) => {
        expect(res.body.unread, "bob should have 1 notification").to.eq(1);
        const note = res.body.items[0];
        expect(note.type).to.eq("comment_mention");
        expect(note.actor).to.eq("alice");
        expect(note.recipient).to.eq("bob");
        expect(note.url).to.match(/^\/verses\/gn\/1#1$/);
      });
    });

    it("@ghost (non-existent user) creates no notification", () => {
      cy.loginAs(users.alice.email, users.alice.password);
      getVerseId("gn", 1, 1).then((verseId) => {
        cy.request({
          method: "POST",
          url: `/api/comments/${verseId}`,
          body: { text: "Olá @ghost-user-not-real, vamos ver", tags: [] },
        });
      });

      // Bob shouldn't have anything (he wasn't mentioned).
      cy.clearCookies();
      cy.loginAs(users.bob.email, users.bob.password);
      cy.request("/api/notifications").then((res) => {
        expect(res.body.unread).to.eq(0);
      });

      // Mod shouldn't either.
      cy.clearCookies();
      cy.loginAs(users.mod.email, users.mod.password);
      cy.request("/api/notifications").then((res) => {
        expect(res.body.unread).to.eq(0);
      });
    });

    it("self-mention @alice by alice creates no notification", () => {
      cy.loginAs(users.alice.email, users.alice.password);
      getVerseId("gn", 1, 1).then((verseId) => {
        cy.request({
          method: "POST",
          url: `/api/comments/${verseId}`,
          body: { text: "Eu, @alice, escrevendo comigo mesma", tags: [] },
        });
      });

      cy.request("/api/notifications").then((res) => {
        expect(res.body.unread, "self-mention must not notify the actor").to.eq(0);
      });
    });

    it("@bob @mod in one comment creates two notifications (one each)", () => {
      cy.loginAs(users.alice.email, users.alice.password);
      getVerseId("gn", 1, 1).then((verseId) => {
        cy.request({
          method: "POST",
          url: `/api/comments/${verseId}`,
          body: { text: "Pessoal, @bob e @mod, vejam isto", tags: [] },
        });
      });

      cy.clearCookies();
      cy.loginAs(users.bob.email, users.bob.password);
      cy.request("/api/notifications").then((res) => {
        expect(res.body.unread, "bob should have 1").to.eq(1);
      });

      cy.clearCookies();
      cy.loginAs(users.mod.email, users.mod.password);
      cy.request("/api/notifications").then((res) => {
        expect(res.body.unread, "mod should have 1").to.eq(1);
      });
    });

    it("email-shaped strings do NOT trigger mentions", () => {
      cy.loginAs(users.alice.email, users.alice.password);
      getVerseId("gn", 1, 1).then((verseId) => {
        cy.request({
          method: "POST",
          url: `/api/comments/${verseId}`,
          body: { text: "Me escreva em foo@bar.com ou bob@example.com", tags: [] },
        });
      });

      // bob exists as a user, but the parser must skip the email occurrence.
      cy.clearCookies();
      cy.loginAs(users.bob.email, users.bob.password);
      cy.request("/api/notifications").then((res) => {
        expect(
          res.body.unread,
          "email substrings must not trigger mentions",
        ).to.eq(0);
      });
    });
  });

  describe("In discussion answers", () => {
    it("@bob in an answer creates a notification of type answer_mention", () => {
      // Alice creates a discussion anchored to a comment. Bob answers, mentioning mod.
      cy.loginAs(users.alice.email, users.alice.password);
      cy.task<{ id: string }>("db:seedComment", {
        username: "alice",
        abbrev: "gn",
        chapter: 1,
        verseNumber: 1,
        text: "Comentário âncora para discussão.",
        tags: [],
      })
        .then((r) => r.id)
        .then((commentId) =>
          cy.request({
            method: "POST",
            url: "/api/discussion/gn",
            body: {
              commentId,
              title: "Discussão de alice",
              body: "Discussão de alice",
            },
          }),
        )
        .then((createRes) => {
          const discussionId = createRes.body._id as string;

        cy.clearCookies();
        cy.loginAs(users.bob.email, users.bob.password);
        cy.request({
          method: "PATCH",
          url: `/api/discussion/gn/${discussionId}`,
          body: { text: "Concordo, @mod o que acha?" },
        });

        // Mod gets an answer_mention. Alice gets a discussion_answer
        // (the auto-notification for the discussion owner).
        cy.clearCookies();
        cy.loginAs(users.mod.email, users.mod.password);
        cy.request("/api/notifications").then((res) => {
          expect(res.body.unread, "mod should have 1 mention notification").to.eq(1);
          const note = res.body.items.find(
            (n: { type: string }) => n.type === "answer_mention",
          );
          expect(note, "answer_mention notification missing").to.exist;
          expect(note.actor).to.eq("bob");
          expect(note.url).to.eq(`/discussion/gn/${discussionId}`);
        });

        // Alice gets only the discussion_answer (was not @-mentioned).
        cy.clearCookies();
        cy.loginAs(users.alice.email, users.alice.password);
        cy.request("/api/notifications").then((res) => {
          const types = (res.body.items as Array<{ type: string }>).map((n) => n.type);
          expect(types).to.include("discussion_answer");
          expect(types).to.not.include("answer_mention");
        });
      });
    });
  });
});
