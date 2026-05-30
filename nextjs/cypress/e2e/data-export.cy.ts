/**
 * LGPD Art. 18 V — right to data portability.
 *
 * GET /api/users/me/export must return a JSON dump of every record
 * tied to the authenticated user. No password, no other users' data.
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

describe("LGPD — data export endpoint", () => {
  beforeEach(() => {
    cy.resetDb();
    cy.seedDb({
      users: [users.alice, users.bob],
      books: [bookFixture.book],
      verses: bookFixture.verses,
    });
  });

  it("rejects anonymous callers with 401", () => {
    cy.request({
      method: "GET",
      url: "/api/users/me/export",
      failOnStatusCode: false,
    }).its("status").should("eq", 401);
  });

  it("returns JSON with profile + comments + ownedDiscussions + answersAuthored + notifications", () => {
    // ── Bob opens a discussion that alice will answer (so answersAuthored is populated) ──
    cy.loginAs(users.bob.email, users.bob.password);
    cy.task<{ id: string }>("db:seedComment", {
      username: "bob",
      abbrev: "gn",
      chapter: 1,
      verseNumber: 2,
      text: "Comentário âncora do bob.",
      tags: [],
    })
      .then((r) => r.id)
      .then((anchorCommentId) =>
        cy.request({
          method: "POST",
          url: "/api/discussion/gn",
          body: {
            commentId: anchorCommentId,
            title: "Pergunta do bob.",
            body: "Pergunta do bob.",
          },
        }),
      )
      .then((res) => {
        expect(res.status).to.eq(201);
        const bobDiscussionId = res.body._id as string;

      // ── Switch to alice: comment, own discussion, answer bob's discussion ──
      cy.clearCookies();
      cy.loginAs(users.alice.email, users.alice.password);

      getVerseId("gn", 1, 1).then((verseId) => {
        cy.request({
          method: "POST",
          url: `/api/comments/${verseId}`,
          body: { text: "Comentário da alice exclusivo.", tags: ["devocional"] },
        }).its("status").should("eq", 201);

        // Anchor comment authored by bob so it doesn't count toward
        // alice's exported `comments` (the discussion ownership is alice's,
        // derived from the logged-in session, not the comment author).
        cy.task<{ id: string }>("db:seedComment", {
          username: "bob",
          abbrev: "gn",
          chapter: 1,
          verseNumber: 1,
          text: "Comentário âncora para a discussão da alice.",
          tags: [],
        })
          .then((r) => r.id)
          .then((anchorCommentId) =>
            cy.request({
              method: "POST",
              url: "/api/discussion/gn",
              body: {
                commentId: anchorCommentId,
                title: "Pergunta da alice.",
                body: "Pergunta da alice.",
              },
            }),
          )
          .its("status")
          .should("eq", 201);

        cy.request({
          method: "PATCH",
          url: `/api/discussion/gn/${bobDiscussionId}`,
          body: { text: "Resposta da alice na discussão do bob." },
        }).its("status").should("eq", 200);

        // ── Export ──
        cy.request("GET", "/api/users/me/export").then((res) => {
          expect(res.status).to.eq(200);
          expect(res.headers["content-type"]).to.include("application/json");
          expect(res.headers["content-disposition"]).to.match(
            /attachment;\s*filename=.*biblecomment-meus-dados-alice/i,
          );

          const body = res.body;
          expect(body).to.have.property("generatedAt");
          expect(body).to.have.property("profile");
          expect(body).to.have.property("comments");
          expect(body).to.have.property("ownedDiscussions");
          expect(body).to.have.property("answersAuthored");
          expect(body).to.have.property("notifications");

          // Profile must NOT leak the password hash.
          expect(body.profile.email).to.eq(users.alice.email);
          expect(body.profile.username).to.eq("alice");
          expect(body.profile, "exported profile must not include password").to.not.have.property("password");

          // Comments: exactly one, the one alice posted.
          expect(body.comments).to.have.length(1);
          expect(body.comments[0].text).to.eq("Comentário da alice exclusivo.");
          expect(body.comments[0].username).to.eq("alice");

          // ownedDiscussions: alice's own discussion only.
          expect(body.ownedDiscussions).to.have.length(1);
          expect(body.ownedDiscussions[0].question).to.eq("Pergunta da alice.");

          // answersAuthored: alice's reply on bob's discussion.
          expect(body.answersAuthored).to.have.length(1);
          expect(body.answersAuthored[0].verseReference).to.eq("gn 1:2");
          expect(body.answersAuthored[0].text).to.eq(
            "Resposta da alice na discussão do bob.",
          );
        });
      });
    });
  });

  it("export of an empty account returns the structure with empty arrays", () => {
    cy.loginAs(users.alice.email, users.alice.password);

    cy.request("GET", "/api/users/me/export").then((res) => {
      expect(res.status).to.eq(200);
      const body = res.body;
      expect(body.profile.username).to.eq("alice");
      expect(body.comments).to.deep.eq([]);
      expect(body.ownedDiscussions).to.deep.eq([]);
      expect(body.answersAuthored).to.deep.eq([]);
      expect(body.notifications).to.deep.eq([]);
    });
  });
});
