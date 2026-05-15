/**
 * Phase 4.4 — chapter reader filters comments by community.
 *
 * - chips row only appears for users in at least one community
 * - toggling a chip hides/shows the matching comments
 * - selection persists across reload (localStorage)
 */

import users from "../fixtures/users.json";

const BOOK = {
  abbrev: "gn",
  name: "Gênesis",
  chapters: 50,
  testament: "old",
  group: "pentateuco",
  author: "Moisés",
};
const VERSE = {
  abbrev: "gn",
  chapter: 1,
  verseNumber: 1,
  text: "No princípio criou Deus os céus e a terra.",
  reference: "Gênesis 1:1",
};
const LONG_GERAL =
  "Comentario geral sem comunidade, deve sempre aparecer no leitor a menos que o usuario oculte explicitamente o bucket Geral. ".repeat(
    2,
  );
const LONG_REFORMADOS =
  "Comentario marcado com a comunidade reformados, so aparece quando o usuario deixa o chip slash reformados ativo. ".repeat(
    2,
  );
const SNIPPET_GERAL = "Comentario geral sem comunidade";
const SNIPPET_REFORMADOS = "Comentario marcado com a comunidade reformados";

function fetchVerseId(): Cypress.Chainable<string> {
  return cy
    .request("GET", `/api/books/${VERSE.abbrev}/verses/${VERSE.chapter}`)
    .then((res) => {
      const list = res.body as Array<{ _id: string; verseNumber: number }>;
      const v = list.find((x) => x.verseNumber === VERSE.verseNumber);
      expect(v, "seeded verse").to.exist;
      return v!._id;
    });
}

describe("Community filter in chapter reader (Phase 4.4)", () => {
  beforeEach(() => {
    cy.resetDb();
    cy.seedDb({
      users: [
        { ...users.alice, tutorialsCompleted: ["chapter-v1"] },
        { ...users.bob, tutorialsCompleted: ["chapter-v1"] },
      ],
      books: [BOOK],
      verses: [VERSE],
    });

    // Set up: alice creates and joins reformados, then posts one community
    // comment + one general comment so the chip toggle has both buckets to
    // act on.
    cy.loginAs(users.alice.email, users.alice.password);
    cy.request("POST", "/api/communities", {
      slug: "reformados",
      name: "Reformados",
      description: "",
    });
    cy.request("POST", "/api/communities/reformados/join");
    fetchVerseId().then((verseId) => {
      cy.request("POST", `/api/comments/${verseId}`, {
        text: LONG_REFORMADOS,
        tags: ["devocional"],
        communitySlug: "reformados",
      });
      cy.request("POST", `/api/comments/${verseId}`, {
        text: LONG_GERAL,
        tags: ["devocional"],
      });
    });
  });

  it("hides reformados comments when the chip is toggled off", () => {
    // Sanity-check the membership lookup the chip row depends on. Surfacing
    // a clear API failure here beats chasing a generic "element not found".
    cy.request("GET", "/api/users/me/communities").then((res) => {
      expect(res.body.items, "alice's communities").to.have.length(1);
      expect(res.body.items[0].slug).to.eq("reformados");
    });

    cy.visit(`/verses/${VERSE.abbrev}/${VERSE.chapter}`);
    // Filter row is visible because alice belongs to one community.
    cy.get('[data-testid="community-filter-row"]').should("be.visible");

    cy.get("li#1 button").first().click();

    // Both comments visible initially (no filter active).
    cy.contains(SNIPPET_REFORMADOS).should("be.visible");
    cy.contains(SNIPPET_GERAL).should("be.visible");

    // Toggle /reformados off — only Geral remains.
    cy.get('[data-testid="community-filter-chip-reformados"]').click();
    cy.get('[data-testid="community-filter-chip-reformados"]').should(
      "have.attr",
      "data-active",
      "false",
    );
    cy.contains(SNIPPET_REFORMADOS).should("not.exist");
    cy.contains(SNIPPET_GERAL).should("be.visible");
  });

  it("persists selection across reload", () => {
    cy.visit(`/verses/${VERSE.abbrev}/${VERSE.chapter}`);
    cy.get('[data-testid="community-filter-chip-general"]').click();
    cy.get('[data-testid="community-filter-chip-general"]').should(
      "have.attr",
      "data-active",
      "false",
    );

    cy.reload();
    // Same alice, same chapter — chip should still be off after the page reload.
    cy.get('[data-testid="community-filter-chip-general"]').should(
      "have.attr",
      "data-active",
      "false",
    );
  });

  it("reset clears the saved filter", () => {
    cy.visit(`/verses/${VERSE.abbrev}/${VERSE.chapter}`);
    cy.get('[data-testid="community-filter-chip-reformados"]').click();
    cy.get('[data-testid="community-filter-reset"]').click();
    // After reset every chip is back to active = true.
    cy.get('[data-testid="community-filter-chip-reformados"]').should(
      "have.attr",
      "data-active",
      "true",
    );
    cy.get('[data-testid="community-filter-chip-general"]').should(
      "have.attr",
      "data-active",
      "true",
    );
  });

  it("does not render the chip row for users in zero communities", () => {
    cy.clearCookies();
    cy.loginAs(users.bob.email, users.bob.password);
    cy.visit(`/verses/${VERSE.abbrev}/${VERSE.chapter}`);
    cy.get('[data-testid="community-filter-row"]').should("not.exist");
  });
});
