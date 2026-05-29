/**
 * Discussion restructure — full UI flow.
 *
 * Drives the anchored-discussion happy path through the browser: open a
 * comment in the reader, tap "Contribuir", fill the create form, then assert
 * the detail page renders title/quote/body in order, the like toggle persists
 * across reload (server enriches likedByMe), and an answer can be posted +
 * liked.
 *
 * Mirrors comments.cy.ts for opening a verse's comment panel.
 */

import users from "../fixtures/users.json";
import bookFixture from "../fixtures/book-gn.json";

const COMMENT_TEXT = "No princípio Deus criou os céus e a terra.";
const DISCUSSION_TITLE = "Reflexão sobre a criação";
const BODY_LINE_1 = "Primeira linha da minha pergunta.";
const BODY_LINE_2 = "Segunda linha após uma quebra em branco.";

describe("Discussion restructure (UI flow)", () => {
  beforeEach(() => {
    cy.resetDb();
    cy.seedDb({
      // Mark the chapter tutorial complete so its full-screen coach-mark
      // overlay doesn't intercept clicks on the reader panel.
      users: [users.alice].map((u) => ({
        ...u,
        tutorialsCompleted: ["chapter-v1"],
      })),
      books: [bookFixture.book],
      verses: bookFixture.verses,
    });
  });

  it("creates a discussion from a comment, likes it, and answers it", () => {
    cy.loginAs(users.alice.email, users.alice.password);

    // Seed a comment on gn 1:1 so it renders in the reader.
    cy.task("db:seedComment", {
      username: "alice",
      abbrev: "gn",
      chapter: 1,
      verseNumber: 1,
      text: COMMENT_TEXT,
      tags: [],
    });

    // Open the verse's comment panel the same way comments.cy.ts does.
    cy.visit("/verses/gn/1");
    cy.get("li#1 button").first().click();
    cy.contains(COMMENT_TEXT).should("be.visible");

    // Tap "Contribuir" on the rendered comment.
    cy.get('[data-testid="comment-discuss"]').first().click();

    // We land on the create-discussion page anchored to that comment.
    cy.url().should("include", "/discussion/gn/new");

    // The read-only comment snapshot shows the seeded comment text.
    cy.get('[data-testid="create-discussion-comment"]').should(
      "contain",
      COMMENT_TEXT,
    );

    // Fill the title and a body that contains a blank line.
    cy.get('[data-testid="discussion-title-input"]').type(DISCUSSION_TITLE);
    cy.get('[data-testid="discussion-body-input"]').type(
      `${BODY_LINE_1}{enter}{enter}${BODY_LINE_2}`,
    );
    cy.get('[data-testid="submit-discussion"]').click();

    // Detail page: assert content via testids.
    cy.get('[data-testid="discussion-title"]').should(
      "contain",
      DISCUSSION_TITLE,
    );
    cy.get('[data-testid="discussion-quote"]').should("contain", COMMENT_TEXT);
    cy.get('[data-testid="discussion-body"]')
      .should("contain", BODY_LINE_1)
      .and("contain", BODY_LINE_2);

    // DOM order: title comes before body.
    cy.get('[data-testid="discussion-title"]').then(($title) => {
      cy.get('[data-testid="discussion-body"]').then(($body) => {
        const position = $title[0].compareDocumentPosition($body[0]);
        // DOCUMENT_POSITION_FOLLOWING (4) => body follows title in the DOM.
        // eslint-disable-next-line no-bitwise
        expect(position & Node.DOCUMENT_POSITION_FOLLOWING).to.be.greaterThan(0);
      });
    });

    // Like flow: like the discussion, then verify count + aria-pressed.
    cy.get('[data-testid="discussion-like"]').click();
    cy.get('[data-testid="discussion-like"]')
      .should("contain", "1")
      .and("have.attr", "aria-pressed", "true");

    // Reload: the server enriches likedByMe for the viewer, so it persists.
    cy.reload();
    cy.get('[data-testid="discussion-like"]')
      .should("contain", "1")
      .and("have.attr", "aria-pressed", "true");

    // Answer + like the answer.
    cy.get('[data-testid="answer-input"]').type("Minha resposta à discussão.");
    cy.get('[data-testid="submit-answer"]').click();

    cy.get('[data-testid="discussion-answer"]')
      .should("have.length.at.least", 1)
      .first()
      .within(() => {
        cy.get('[data-testid="answer-like"]').click();
        cy.get('[data-testid="answer-like"]').should("contain", "1");
      });
  });
});
