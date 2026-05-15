/**
 * Moderators can flip the admin-verified flag on a comment from the chapter
 * sidebar (instead of bouncing to /admin/moderation).
 */

import users from "../fixtures/users.json";

const VERSE = {
  abbrev: "gn",
  chapter: 1,
  verseNumber: 1,
  text: "No princípio criou Deus os céus e a terra.",
  reference: "Gênesis 1:1",
};
const BOOK = {
  abbrev: "gn",
  name: "Gênesis",
  chapters: 50,
  testament: "old",
  group: "pentateuco",
  author: "Moisés",
};

describe("Moderator inline-verify on chapter comments", () => {
  beforeEach(() => {
    cy.resetDb();
    cy.seedDb({
      users: [
        { ...users.alice, tutorialsCompleted: ["chapter-v1"] },
        { ...users.mod, tutorialsCompleted: ["chapter-v1"] },
      ],
      books: [BOOK],
      verses: [VERSE],
    });
    // alice posts a comment under verse 1.
    cy.loginAs(users.alice.email, users.alice.password);
    cy.request("GET", `/api/books/${VERSE.abbrev}/verses/${VERSE.chapter}`).then(
      (res) => {
        const verseDoc = res.body.find(
          (v: { verseNumber: number }) => v.verseNumber === VERSE.verseNumber,
        );
        cy.request("POST", `/api/comments/${verseDoc._id}`, {
          text: "Comentário longo o suficiente para passar do mínimo de duzentos caracteres porque a validação do composer exige um corpo significativo do leitor para evitar mensagens triviais que poluiriam a área de comentários do versículo. ",
          tags: ["devocional"],
        });
      },
    );
    cy.clearCookies();
  });

  it("non-moderator does not see the verify button", () => {
    cy.loginAs(users.alice.email, users.alice.password);
    cy.visit(`/verses/${VERSE.abbrev}/${VERSE.chapter}`);
    cy.get("li#1 button").first().click();
    cy.get('[data-testid^="mod-verify-"]').should("not.exist");
  });

  it("moderator can verify and unverify inline", () => {
    cy.loginAs(users.mod.email, users.mod.password);
    cy.visit(`/verses/${VERSE.abbrev}/${VERSE.chapter}`);
    cy.get("li#1 button").first().click();

    cy.get('[data-testid^="mod-verify-"]')
      .should("have.attr", "data-verified", "false")
      .click();

    cy.get('[data-testid^="mod-verify-"]').should(
      "have.attr",
      "data-verified",
      "true",
    );

    // Toggle back off.
    cy.get('[data-testid^="mod-verify-"]').click();
    cy.get('[data-testid^="mod-verify-"]').should(
      "have.attr",
      "data-verified",
      "false",
    );
  });
});
