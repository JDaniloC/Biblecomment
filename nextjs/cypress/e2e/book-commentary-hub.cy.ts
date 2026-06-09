/**
 * Book commentary hub pages (/comentario, /comentario/[slug]) — SEO landing
 * pages generated from book data. Public (no auth needed to view). We seed the
 * gn fixture and assert the hub renders the H1/title/chapter links/breadcrumb,
 * the index lists the book, an unknown slug 404s, and a created discussion
 * surfaces on the hub.
 */

import users from "../fixtures/users.json";
import bookFixture from "../fixtures/book-gn.json";

describe("Book commentary hub (/comentario)", () => {
  const book = bookFixture.book; // Gênesis / gn / 50 chapters
  const slug = "genesis";

  beforeEach(() => {
    cy.resetDb();
    cy.seedDb({
      users: [users.alice],
      books: [book],
      verses: bookFixture.verses,
    });
  });

  it("renders the book hub: H1, title, chapter links, breadcrumb JSON-LD", () => {
    cy.visit(`/comentario/${slug}`);

    cy.get('[data-testid="commentary-hub"]').should("be.visible");
    cy.get("h1").should("contain.text", `Comentário bíblico de ${book.name}`);
    cy.title().should("contain", `Comentário bíblico de ${book.name}`);

    cy.get('[data-testid="hub-chapter-1"]').should(
      "have.attr",
      "href",
      `/verses/${book.abbrev}/1`,
    );
    cy.get('[data-testid="hub-chapter-50"]').should(
      "have.attr",
      "href",
      `/verses/${book.abbrev}/50`,
    );

    cy.get('script[type="application/ld+json"]')
      .should("contain.text", "BreadcrumbList")
      .and("contain.text", "Comentário bíblico");
  });

  it("surfaces the book's discussions on the hub", () => {
    cy.loginAs(users.alice.email, users.alice.password);

    cy.task<{ id: string }>("db:seedComment", {
      username: "alice",
      abbrev: "gn",
      chapter: 1,
      verseNumber: 1,
      text: "No princípio Deus criou os céus e a terra.",
      tags: [],
    }).then((r) => {
      cy.request({
        method: "POST",
        url: "/api/discussion/gn",
        body: { commentId: r.id, title: "Sobre a criação", body: "Corpo" },
      })
        .its("status")
        .should("eq", 201);

      cy.visit(`/comentario/${slug}`);
      cy.get('[data-testid="commentary-hub"]').should(
        "contain.text",
        "Sobre a criação",
      );
    });
  });

  it("index page lists books linking to their hubs", () => {
    cy.visit("/comentario");

    cy.get('[data-testid="commentary-index"]').should("be.visible");
    cy.get("h1").should("contain.text", "Bíblia comentada");
    cy.get(`a[href="/comentario/${slug}"]`).should("contain.text", book.name);
  });

  it("unknown slug returns 404", () => {
    cy.request({
      url: "/comentario/livro-inexistente",
      failOnStatusCode: false,
    })
      .its("status")
      .should("eq", 404);
  });
});
