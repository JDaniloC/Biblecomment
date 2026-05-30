import users from "../fixtures/users.json";
import bookFixture from "../fixtures/book-gn.json";

describe("Mobile bottom tab bar", () => {
  const abbrev = bookFixture.book.abbrev;

  beforeEach(() => {
    cy.resetDb();
    cy.seedDb({
      // All tours marked done so the /home tour doesn't auto-open and cover
      // the bottom tab bar with the driver.js overlay (pointer-events:none).
      // Mirrors src/lib/tutorial-config.ts.
      users: [
        {
          ...users.alice,
          tutorialsCompleted: [
            "home-v1",
            "chapter-v1",
            "communities-v1",
            "discussions-v1",
            "profile-v1",
          ],
        },
      ],
      books: [bookFixture.book],
      verses: bookFixture.verses,
    });
    cy.viewport(390, 844); // iPhone-ish
  });

  it("shows 4 tabs on mobile and hides them on desktop", () => {
    cy.loginAs(users.alice.email, users.alice.password);
    cy.visit("/home");
    cy.get('[data-testid="mobile-tabbar"]').should("be.visible");
    cy.get('[data-testid="tab-livros"]').should("be.visible");
    cy.get('[data-testid="tab-discussoes"]').should("be.visible");
    cy.get('[data-testid="tab-comunidades"]').should("be.visible");
    cy.get('[data-testid="tab-notificacoes"]').should("be.visible");
    cy.viewport(1280, 800);
    cy.get('[data-testid="mobile-tabbar"]').should("not.be.visible");
  });

  it("navigates and marks the active tab", () => {
    cy.loginAs(users.alice.email, users.alice.password);
    cy.visit("/home");
    cy.get('[data-testid="tab-comunidades"]').click();
    cy.location("pathname").should("eq", "/communities");
    cy.get('[data-testid="tab-comunidades"]').should("have.class", "text-brand");
  });

  it("anonymous sees Entrar instead of Notificações", () => {
    // /home redirects anonymous to /login; use a public reader page.
    cy.visit(`/verses/${abbrev}/1`);
    cy.get('[data-testid="tab-entrar"]').should("be.visible");
    cy.get('[data-testid="tab-notificacoes"]').should("not.exist");
    cy.get('[data-testid="tab-entrar"]').click();
    cy.location("pathname").should("eq", "/login");
  });

  it("notifications tab opens the sheet", () => {
    cy.loginAs(users.alice.email, users.alice.password);
    cy.visit("/home");
    cy.get('[data-testid="tab-notificacoes"]').click();
    cy.get('[data-testid="mobile-notif-sheet"]').should("be.visible");
  });

  it("page tools (zoom) reachable on mobile via header overflow", () => {
    cy.loginAs(users.alice.email, users.alice.password);
    cy.visit(`/verses/${abbrev}/1`);
    cy.get('[data-testid="header-tools-menu"]').click();
    cy.get('[data-testid="header-tools-panel"]').within(() => {
      cy.findByLabelText("Aumentar tamanho do texto").click();
    });
    cy.window().then((win) =>
      expect(
        win.getComputedStyle(win.document.body).zoom as unknown as string,
      ).to.eq("1.1"),
    );
  });

  it("tab bar hides while the chapter comment panel is open", () => {
    cy.loginAs(users.alice.email, users.alice.password);
    cy.visit(`/verses/${abbrev}/1`);
    cy.get('[data-testid="mobile-tabbar"]').should("be.visible");
    cy.get("#1").click(); // first verse opens the comment panel
    cy.get('[data-testid="mobile-tabbar"]').should("not.be.visible");
  });
});
