/**
 * @username search — typing "@" in the search box switches the unified
 * endpoint into user-lookup mode and offers a "Usuários" section that
 * navigates to /u/{username}.
 */

import users from "../fixtures/users.json";

describe("Search by @username", () => {
  beforeEach(() => {
    cy.resetDb();
    cy.seedDb({ users: [users.alice, users.bob] });
  });

  describe("API — /api/search/unified", () => {
    it("returns users on @-prefix and empty verses/comments", () => {
      cy.request("/api/search/unified?q=" + encodeURIComponent("@al")).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body.users).to.have.length(1);
        expect(res.body.users[0].username).to.eq("alice");
        expect(res.body.verses).to.deep.eq([]);
        expect(res.body.comments).to.deep.eq([]);
      });
    });

    it("lone @ returns empty users", () => {
      cy.request("/api/search/unified?q=" + encodeURIComponent("@")).then((res) => {
        // q is "@" (1 char) — endpoint short-circuits at <2 chars.
        expect(res.body.users ?? []).to.deep.eq([]);
      });
    });

    it("@-prefix that matches no one returns empty list", () => {
      cy.request(
        "/api/search/unified?q=" + encodeURIComponent("@zzzzzz"),
      ).then((res) => {
        expect(res.body.users).to.deep.eq([]);
      });
    });

    it("non-@ queries do not populate users array", () => {
      cy.request("/api/search/unified?q=alice").then((res) => {
        // Plain-text mode: users array is present but empty.
        expect(res.body.users ?? []).to.deep.eq([]);
      });
    });
  });

  describe("UI — OmniSearch dropdown", () => {
    beforeEach(() => {
      cy.loginAs(users.alice.email, users.alice.password);
      cy.visit("/home");
    });

    it("shows Usuários section when typing @ prefix and navigates on click", () => {
      cy.findByLabelText(/Buscar versículos/i).type("@bo");
      cy.get('[data-testid="omni-search-users"]').should("be.visible");
      cy.get('[data-testid="omni-search-user-bob"]').click();
      cy.location("pathname").should("eq", "/u/bob");
    });
  });
});
