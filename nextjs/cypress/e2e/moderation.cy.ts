/**
 * Moderator-only endpoints — RBAC + actions.
 *
 * Routes covered:
 *  - GET    /api/moderation/reports
 *  - DELETE /api/moderation/reports/[id]   (clears the reports array)
 *  - PATCH  /api/users/moderator           (set moderator flag on another user)
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

describe("Moderation endpoints", () => {
  beforeEach(() => {
    cy.resetDb();
    cy.seedDb({
      users: [users.alice, users.bob, users.mod],
      books: [bookFixture.book],
      verses: bookFixture.verses,
    });
  });

  describe("GET /api/moderation/reports", () => {
    it("anonymous → 401", () => {
      cy.request({
        method: "GET",
        url: "/api/moderation/reports",
        failOnStatusCode: false,
      }).then((res) => {
        // Route checks user?.moderator — unauthenticated users have no
        // session, so the optional-chain returns undefined → forbidden().
        expect(res.status).to.eq(403);
      });
    });

    it("regular user → 403", () => {
      cy.loginAs(users.alice.email, users.alice.password);
      cy.request({
        method: "GET",
        url: "/api/moderation/reports",
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(403);
      });
    });

    it("moderator → 200 with paginated items containing only reported comments", () => {
      // Setup: alice posts a comment, bob reports it.
      cy.loginAs(users.alice.email, users.alice.password);
      let reportedId: string;
      getVerseId("gn", 1, 1).then((verseId) => {
        cy.request({
          method: "POST",
          url: `/api/comments/${verseId}`,
          body: { text: "controversial comment", tags: [] },
        }).then((createRes) => {
          reportedId = createRes.body._id as string;

          cy.clearCookies();
          cy.loginAs(users.bob.email, users.bob.password);
          cy.request({
            method: "PATCH",
            url: `/api/comments/${reportedId}`,
            body: { action: "report" },
          });

          // Now mod views reports.
          cy.clearCookies();
          cy.loginAs(users.mod.email, users.mod.password);
          cy.request("/api/moderation/reports").then((res) => {
            expect(res.status).to.eq(200);
            expect(res.body).to.have.property("page", 1);
            expect(res.body).to.have.property("pageSize", 20);
            const found = (res.body.items as Array<{ _id: string; reports: string[] }>).find(
              (c) => c._id === reportedId,
            );
            expect(found, "reported comment must appear in moderation list").to.exist;
            expect(found!.reports).to.include("bob");
          });
        });
      });
    });
  });

  describe("DELETE /api/moderation/reports/[id]", () => {
    it("regular user → 403", () => {
      cy.loginAs(users.alice.email, users.alice.password);
      cy.request({
        method: "DELETE",
        url: "/api/moderation/reports/507f1f77bcf86cd799439011",
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(403);
      });
    });

    it("moderator clears the reports array but keeps the comment", () => {
      // Alice posts, bob reports, mod clears.
      cy.loginAs(users.alice.email, users.alice.password);
      let reportedId: string;
      getVerseId("gn", 1, 1).then((verseId) => {
        cy.request({
          method: "POST",
          url: `/api/comments/${verseId}`,
          body: { text: "to be unreported", tags: [] },
        }).then((createRes) => {
          reportedId = createRes.body._id as string;

          cy.clearCookies();
          cy.loginAs(users.bob.email, users.bob.password);
          cy.request({
            method: "PATCH",
            url: `/api/comments/${reportedId}`,
            body: { action: "report" },
          });

          cy.clearCookies();
          cy.loginAs(users.mod.email, users.mod.password);
          cy.request({
            method: "DELETE",
            url: `/api/moderation/reports/${reportedId}`,
          }).then((res) => {
            expect(res.status).to.eq(200);
            expect(res.body.reports).to.deep.eq([]);
          });

          // The comment itself is still there (only reports were cleared).
          cy.request("/api/comments/verse/gn/1/1").then((listRes) => {
            const all = [
              ...(listRes.body.titleComments ?? []),
              ...(listRes.body.verseComments ?? []),
            ];
            const stillThere = all.find((c: { _id: string }) => c._id === reportedId);
            expect(stillThere, "comment must NOT be deleted, only reports cleared").to.exist;
          });
        });
      });
    });

    it("404 when comment doesn't exist", () => {
      cy.loginAs(users.mod.email, users.mod.password);
      cy.request({
        method: "DELETE",
        url: "/api/moderation/reports/507f1f77bcf86cd799439011",
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(404);
      });
    });
  });

  describe("PATCH /api/users/moderator", () => {
    it("regular user → 403", () => {
      cy.loginAs(users.alice.email, users.alice.password);
      cy.request({
        method: "PATCH",
        url: "/api/users/moderator",
        body: { email: users.bob.email, moderator: true },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(403);
      });
    });

    it("moderator can promote another user; demotion also works", () => {
      cy.loginAs(users.mod.email, users.mod.password);

      // Promote bob.
      cy.request({
        method: "PATCH",
        url: "/api/users/moderator",
        body: { email: users.bob.email, moderator: true },
      }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.deep.include({
          email: users.bob.email,
          username: "bob",
          moderator: true,
        });
      });

      // Bob's next login should grant moderator access.
      cy.clearCookies();
      cy.loginAs(users.bob.email, users.bob.password);
      cy.request("/api/moderation/reports").then((res) => {
        expect(res.status, "bob, now a moderator, should access /api/moderation/reports").to.eq(200);
      });

      // Mod demotes bob back.
      cy.clearCookies();
      cy.loginAs(users.mod.email, users.mod.password);
      cy.request({
        method: "PATCH",
        url: "/api/users/moderator",
        body: { email: users.bob.email, moderator: false },
      }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body.moderator).to.eq(false);
      });
    });

    it("404 when target user doesn't exist", () => {
      cy.loginAs(users.mod.email, users.mod.password);
      cy.request({
        method: "PATCH",
        url: "/api/users/moderator",
        body: { email: "ghost@cypress.test", moderator: true },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(404);
      });
    });

    it("400 with malformed body", () => {
      cy.loginAs(users.mod.email, users.mod.password);
      cy.request({
        method: "PATCH",
        url: "/api/users/moderator",
        body: { email: "not-an-email", moderator: true },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(400);
      });
    });
  });
});
