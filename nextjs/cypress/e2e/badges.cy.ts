/**
 * Badge system — mark-as-read button, evaluator triggers, Conquistas tab.
 *
 * Scope: end-to-end through the UI for the most common unlock paths.
 * Backfill is covered by a unit test for the script (8.4); no need to
 * exercise that here.
 */

import users from "../fixtures/users.json";
import bookGn from "../fixtures/book-gn.json";

describe("Badges", () => {
  beforeEach(() => {
    cy.resetDb();
    cy.seedDb({
      // Mark the chapter tutorial as completed for alice/bob so the
      // onboarding popover doesn't intercept clicks on the mark-as-read button
      // when the test logs in for the first time.
      users: [
        { ...users.alice, tutorialsCompleted: ["chapter-v1"] },
        { ...users.bob,   tutorialsCompleted: ["chapter-v1"] },
      ],
      books: [bookGn.book],
      verses: bookGn.verses,
    });
  });

  describe("mark chapter as read", () => {
    it("anonymous viewer does NOT see the mark-as-read button", () => {
      cy.visit(`/verses/${bookGn.book.abbrev}/1`);
      cy.get('[data-testid="mark-as-read"]').should("not.exist");
    });

    it("first mark unlocks first-read + reader-bronze countdown begins", () => {
      cy.loginAs(users.alice.email, users.alice.password);
      cy.visit(`/verses/${bookGn.book.abbrev}/1`);

      cy.get('[data-testid="mark-as-read"]')
        .should("contain.text", "Marcar como lido")
        .click();

      // Toast only appears AFTER the server action returns — using it as the
      // "server completed" signal before checking DB state, otherwise the
      // optimistic UI flip races ahead of the persisted write.
      cy.contains("Conquista desbloqueada").should("be.visible");

      cy.get('[data-testid="mark-as-read"]')
        .should("have.attr", "aria-pressed", "true")
        .and("contain.text", "Lido");

      cy.task<number>("db:countChapterReads", users.alice.email).should("eq", 1);
      cy.task<string[]>("db:getUserBadges", users.alice.email).should("include", "first-read");
    });

    it("toggling off removes the mark (read tracker only — first-read sticks)", () => {
      cy.loginAs(users.alice.email, users.alice.password);
      cy.visit(`/verses/${bookGn.book.abbrev}/1`);
      cy.get('[data-testid="mark-as-read"]').click();
      cy.get('[data-testid="mark-as-read"]').should("have.attr", "aria-pressed", "true");
      cy.get('[data-testid="mark-as-read"]').click();
      cy.get('[data-testid="mark-as-read"]').should("have.attr", "aria-pressed", "false");
      cy.task<number>("db:countChapterReads", users.alice.email).should("eq", 0);
      // Earned badges are intentionally NOT revoked when un-marking.
      cy.task<string[]>("db:getUserBadges", users.alice.email).should("include", "first-read");
    });

    it("reload preserves the read state from the server", () => {
      cy.task("db:seedChapterRead", {
        email: users.alice.email,
        abbrev: bookGn.book.abbrev,
        chapter: 1,
      });
      cy.loginAs(users.alice.email, users.alice.password);
      cy.visit(`/verses/${bookGn.book.abbrev}/1`);
      cy.get('[data-testid="mark-as-read"]').should("have.attr", "aria-pressed", "true");
    });
  });

  describe("Conquistas tab", () => {
    it("renders all 30 catalog badges, with a summary count", () => {
      cy.loginAs(users.alice.email, users.alice.password);
      cy.visit("/profile");
      cy.contains("button", /conquistas/i).click();

      cy.get('[data-testid="badges-tab"]').should("be.visible");
      cy.get('[data-testid="badges-summary"]').should("contain.text", "0 de 30");
      cy.get('[data-testid^="badge-card-"]').should("have.length", 30);
    });

    it("flips a card to earned after the user marks a chapter", () => {
      cy.loginAs(users.alice.email, users.alice.password);
      cy.visit(`/verses/${bookGn.book.abbrev}/1`);
      cy.get('[data-testid="mark-as-read"]').click();
      // Wait for the unlock toast — that's the post-action signal. The
      // aria-pressed flip is optimistic and arrives before persistence;
      // navigating on aria-pressed alone races the badge write.
      cy.contains("Conquista desbloqueada").should("be.visible");
      cy.get('[data-testid="mark-as-read"]').should("have.attr", "aria-pressed", "true");

      cy.visit("/profile");
      cy.contains("button", /conquistas/i).click();

      cy.get('[data-testid="badge-card-first-read"]')
        .should("have.attr", "data-earned", "true");
      cy.get('[data-testid="badges-summary"]').should("contain.text", "1 de 30");
    });
  });
});
