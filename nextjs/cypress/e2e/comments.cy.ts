/**
 * Comment lifecycle: CRUD + like + report + ownership + moderator override.
 *
 * The unit tests in CommentUseCases.test.ts already cover the auth/owner
 * branches with mocked repos. This spec exercises the full HTTP+Mongo
 * stack: cookies, Mongoose persistence, parseBody validation.
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

describe("Comments — full lifecycle", () => {
  beforeEach(() => {
    cy.resetDb();
    cy.seedDb({
      users: [users.alice, users.bob, users.mod],
      books: [bookFixture.book],
      verses: bookFixture.verses,
    });
  });

  describe("Create", () => {
    it("authenticated user posts and the comment appears in the verse listing", () => {
      cy.loginAs(users.alice.email, users.alice.password);

      getVerseId("gn", 1, 1).then((verseId) => {
        cy.request({
          method: "POST",
          url: `/api/comments/${verseId}`,
          body: { text: "Comentário de teste — alice em Gn 1:1", tags: ["devocional"] },
        }).then((res) => {
          expect(res.status).to.eq(201);
          expect(res.body).to.have.property("username", "alice");
          expect(res.body).to.have.property("text", "Comentário de teste — alice em Gn 1:1");
        });
      });

      cy.request("/api/comments/verse/gn/1/1").then((res) => {
        const all = [...(res.body.titleComments ?? []), ...(res.body.verseComments ?? [])];
        const mine = all.find((c: { username: string }) => c.username === "alice");
        expect(mine, "alice's comment should appear in the verse listing").to.exist;
      });
    });

    it("rejects anonymous POST with 401", () => {
      getVerseId("gn", 1, 1).then((verseId) => {
        cy.request({
          method: "POST",
          url: `/api/comments/${verseId}`,
          body: { text: "should not land", tags: [] },
          failOnStatusCode: false,
        }).then((res) => {
          expect(res.status).to.eq(401);
        });
      });
    });

    it("rejects empty text with 400 (Zod validation)", () => {
      cy.loginAs(users.alice.email, users.alice.password);
      getVerseId("gn", 1, 1).then((verseId) => {
        cy.request({
          method: "POST",
          url: `/api/comments/${verseId}`,
          body: { text: "", tags: [] },
          failOnStatusCode: false,
        }).then((res) => {
          expect(res.status).to.eq(400);
          expect(res.body).to.have.property("error", "Validation failed");
        });
      });
    });
  });

  describe("Update (PATCH)", () => {
    it("owner can edit their own comment text", () => {
      cy.loginAs(users.alice.email, users.alice.password);
      getVerseId("gn", 1, 1).then((verseId) => {
        cy.request({
          method: "POST",
          url: `/api/comments/${verseId}`,
          body: { text: "first draft", tags: [] },
        }).then((createRes) => {
          const id = createRes.body._id as string;
          cy.request({
            method: "PATCH",
            url: `/api/comments/${id}`,
            body: { text: "edited by alice", tags: ["pessoal"] },
          }).then((patchRes) => {
            expect(patchRes.status).to.eq(200);
            expect(patchRes.body).to.have.property("text", "edited by alice");
            expect(patchRes.body.tags).to.include("pessoal");
          });
        });
      });
    });

    it("non-owner gets 403 when editing someone else's comment", () => {
      cy.loginAs(users.alice.email, users.alice.password);
      let commentId: string;
      getVerseId("gn", 1, 1).then((verseId) => {
        cy.request({
          method: "POST",
          url: `/api/comments/${verseId}`,
          body: { text: "alice's comment", tags: [] },
        }).then((createRes) => {
          commentId = createRes.body._id as string;

          // Switch to bob and try to edit alice's comment.
          cy.clearCookies();
          cy.loginAs(users.bob.email, users.bob.password);
          cy.request({
            method: "PATCH",
            url: `/api/comments/${commentId}`,
            body: { text: "bob hijacking", tags: [] },
            failOnStatusCode: false,
          }).then((res) => {
            expect(res.status).to.eq(403);
          });
        });
      });
    });
  });

  describe("Like / Report (PATCH with action)", () => {
    it("toggle like adds and removes the username in likes", () => {
      cy.loginAs(users.alice.email, users.alice.password);
      getVerseId("gn", 1, 1).then((verseId) => {
        cy.request({
          method: "POST",
          url: `/api/comments/${verseId}`,
          body: { text: "likeable", tags: [] },
        }).then((createRes) => {
          const id = createRes.body._id as string;

          cy.clearCookies();
          cy.loginAs(users.bob.email, users.bob.password);

          cy.request({
            method: "PATCH",
            url: `/api/comments/${id}`,
            body: { action: "like" },
          }).then((res) => {
            expect(res.body.likes).to.include("bob");
          });

          // Toggle off.
          cy.request({
            method: "PATCH",
            url: `/api/comments/${id}`,
            body: { action: "like" },
          }).then((res) => {
            expect(res.body.likes).to.not.include("bob");
          });
        });
      });
    });

    it("report adds the username to reports and is idempotent", () => {
      cy.loginAs(users.alice.email, users.alice.password);
      getVerseId("gn", 1, 1).then((verseId) => {
        cy.request({
          method: "POST",
          url: `/api/comments/${verseId}`,
          body: { text: "reportable", tags: [] },
        }).then((createRes) => {
          const id = createRes.body._id as string;

          cy.clearCookies();
          cy.loginAs(users.bob.email, users.bob.password);

          cy.request({
            method: "PATCH",
            url: `/api/comments/${id}`,
            body: { action: "report" },
          }).then((res) => {
            expect(res.body.reports).to.include("bob");
          });

          // Reporting again is a no-op (Mongoose $addToSet).
          cy.request({
            method: "PATCH",
            url: `/api/comments/${id}`,
            body: { action: "report" },
          }).then((res) => {
            const occurrences = (res.body.reports as string[]).filter((u) => u === "bob").length;
            expect(occurrences, "report must be idempotent").to.eq(1);
          });
        });
      });
    });
  });

  describe("Delete", () => {
    it("owner can delete their own comment", () => {
      cy.loginAs(users.alice.email, users.alice.password);
      getVerseId("gn", 1, 1).then((verseId) => {
        cy.request({
          method: "POST",
          url: `/api/comments/${verseId}`,
          body: { text: "to delete", tags: [] },
        }).then((createRes) => {
          const id = createRes.body._id as string;
          cy.request({ method: "DELETE", url: `/api/comments/${id}` }).then((res) => {
            expect(res.status).to.eq(200);
            expect(res.body).to.have.property("success", true);
          });
        });
      });
    });

    it("moderator can delete anyone's comment", () => {
      cy.loginAs(users.alice.email, users.alice.password);
      let commentId: string;
      getVerseId("gn", 1, 1).then((verseId) => {
        cy.request({
          method: "POST",
          url: `/api/comments/${verseId}`,
          body: { text: "alice's, mod will delete", tags: [] },
        }).then((createRes) => {
          commentId = createRes.body._id as string;

          cy.clearCookies();
          cy.loginAs(users.mod.email, users.mod.password);
          cy.request({ method: "DELETE", url: `/api/comments/${commentId}` }).then((res) => {
            expect(res.status).to.eq(200);
          });
        });
      });
    });

    it("non-owner non-moderator gets 403", () => {
      cy.loginAs(users.alice.email, users.alice.password);
      let commentId: string;
      getVerseId("gn", 1, 1).then((verseId) => {
        cy.request({
          method: "POST",
          url: `/api/comments/${verseId}`,
          body: { text: "alice's", tags: [] },
        }).then((createRes) => {
          commentId = createRes.body._id as string;

          cy.clearCookies();
          cy.loginAs(users.bob.email, users.bob.password);
          cy.request({
            method: "DELETE",
            url: `/api/comments/${commentId}`,
            failOnStatusCode: false,
          }).then((res) => {
            expect(res.status).to.eq(403);
          });
        });
      });
    });
  });
});
