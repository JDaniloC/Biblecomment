/**
 * Accessibility font-size control now zooms the whole interface.
 *
 * The FontSizeControl writes `--bc-text-scale` to <html> (+ localStorage).
 * A global rule `body { zoom: var(--bc-text-scale, 1) }` makes that scale the
 * entire app, not just the verse text. The verse text itself is a fixed 17px
 * so it is no longer double-scaled.
 */

import users from "../fixtures/users.json";
import bookFixture from "../fixtures/book-gn.json";

describe("Accessibility — global zoom", () => {
  const abbrev = bookFixture.book.abbrev;

  beforeEach(() => {
    cy.resetDb();
    cy.seedDb({
      // chapter-v1 completed so the driver.js tutorial overlay (which sets
      // pointer-events:none on the page shell) doesn't block clicks.
      users: [{ ...users.alice, tutorialsCompleted: ["chapter-v1"] }],
      books: [bookFixture.book],
      verses: bookFixture.verses,
    });
    cy.loginAs(users.alice.email, users.alice.password);
    cy.viewport(1280, 800); // FontSizeControl is desktop-only (md:inline-flex)
  });

  function bodyZoom(): Cypress.Chainable<string> {
    return cy
      .window()
      .then(
        (win) =>
          win.getComputedStyle(win.document.body).zoom as unknown as string,
      );
  }

  it("A+ zooms the whole interface and persists across reload", () => {
    cy.visit(`/verses/${abbrev}/1`);

    bodyZoom().should("eq", "1");

    cy.findByLabelText("Aumentar tamanho do texto").click();

    bodyZoom().should("eq", "1.1");

    cy.reload();
    bodyZoom().should("eq", "1.1");

    // Reset returns the whole UI to 1.
    cy.findByLabelText("Resetar tamanho do texto").click();
    bodyZoom().should("eq", "1");
  });

  it("verse text is a fixed 17px so it is not double-scaled by the zoom", () => {
    cy.visit(`/verses/${abbrev}/1`);

    cy.get('[data-testid="verse-text"]')
      .first()
      .should("have.attr", "style")
      .and("contain", "17px")
      .and("not.contain", "var(--bc-text-scale");
  });

  // `100vh`/px lengths inside a `zoom`-ed ancestor render scaled by that zoom
  // factor (unlike `vh`, which always resolves against the real viewport).
  // The comments sidebar sizes itself with `calc(100vh - 68px)`, so at any
  // scale != 1 it must counter-divide by `--bc-text-scale`, or its rendered
  // edges drift from the real viewport (gap at the bottom when scale < 1,
  // unreachable overflow when scale > 1).
  it("comments sidebar fills exactly from the header to the viewport bottom at any text scale", () => {
    cy.visit(`/verses/${abbrev}/1`);
    cy.get('[data-testid="verse-text"]').first().click();
    cy.get('[data-testid="comments-sidebar"]').should("be.visible");

    function assertSidebarFillsViewport() {
      cy.window().then((win) => {
        cy.get('[data-testid="comments-sidebar"]').then(([el]) => {
          const rect = el.getBoundingClientRect();
          expect(rect.bottom).to.be.closeTo(win.innerHeight, 2);
          expect(rect.top).to.be.closeTo(68, 2);
        });
      });
    }

    assertSidebarFillsViewport();

    cy.findByLabelText("Diminuir tamanho do texto").click();
    cy.findByLabelText("Diminuir tamanho do texto").click();
    assertSidebarFillsViewport();

    cy.findByLabelText("Resetar tamanho do texto").click();
    cy.findByLabelText("Aumentar tamanho do texto").click();
    cy.findByLabelText("Aumentar tamanho do texto").click();
    cy.findByLabelText("Aumentar tamanho do texto").click();
    assertSidebarFillsViewport();
  });
});
