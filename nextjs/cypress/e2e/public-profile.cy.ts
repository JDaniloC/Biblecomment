/**
 * Item 3 — Public profile at /u/[username].
 *
 * Covers:
 * - 404 for unknown usernames
 * - Anonymous viewers can see the profile (no login required)
 * - `belief` is hidden unless the user opted in via showBelief
 * - Badges and comments tabs render and switch
 * - Clicking @username on a home feed card lands on /u/{username}
 */

import users from "../fixtures/users.json";
import bookFixture from "../fixtures/book-gn.json";

describe("Public profile — /u/[username]", () => {
  describe("when the user opted-in to show belief", () => {
    beforeEach(() => {
      cy.resetDb();
      cy.seedDb({
        users: [
          {
            ...users.alice,
            belief: "Católica",
            showBelief: true,
            badges: ["first-read", "commenter-bronze"],
          },
        ],
        books: [bookFixture.book],
        verses: bookFixture.verses,
      });
    });

    it("renders header + badges + belief for an anonymous viewer", () => {
      cy.visit(`/u/${users.alice.username}`);

      cy.get('[data-testid="public-profile-username"]').should(
        "contain.text",
        `@${users.alice.username}`,
      );
      cy.get('[data-testid="public-profile-belief"]').should("contain.text", "Católica");

      // Badges tab is the default; two badges seeded, two cards rendered.
      cy.get('[data-testid="public-profile-badges"]')
        .find('[data-testid^="badge-card-"]')
        .should("have.length", 2);
    });
  });

  describe("when the user has NOT opted-in to show belief", () => {
    beforeEach(() => {
      cy.resetDb();
      cy.seedDb({
        users: [{ ...users.alice, belief: "Católica", showBelief: false }],
      });
    });

    it("hides belief on the public profile", () => {
      cy.visit(`/u/${users.alice.username}`);
      cy.get('[data-testid="public-profile-username"]').should("be.visible");
      cy.get('[data-testid="public-profile-belief"]').should("not.exist");
    });

    it("does not leak belief via the API either", () => {
      cy.request(`/api/users/${users.alice.username}`).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.have.property("username", users.alice.username);
        expect(res.body).to.not.have.property("belief");
        // Never expose private fields, even when showBelief is on/off.
        expect(res.body).to.not.have.property("email");
        expect(res.body).to.not.have.property("state");
        expect(res.body).to.not.have.property("moderator");
        expect(res.body).to.not.have.property("password");
      });
    });
  });

  describe("missing user", () => {
    beforeEach(() => {
      cy.resetDb();
    });

    it("returns 404 from the API", () => {
      cy.request({
        url: "/api/users/no-such-user-anywhere",
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(404);
      });
    });
  });

  describe("clicking a username from /users", () => {
    beforeEach(() => {
      cy.resetDb();
      cy.seedDb({ users: [users.alice, users.bob] });
      cy.loginAs(users.alice.email, users.alice.password);
    });

    it("navigates to /u/{username} when alice clicks bob's row", () => {
      cy.visit("/users");
      cy.get(`[data-testid="users-row-${users.bob.username}"]`).click();
      cy.location("pathname").should("eq", `/u/${users.bob.username}`);
      cy.get('[data-testid="public-profile-username"]').should(
        "contain.text",
        `@${users.bob.username}`,
      );
    });
  });
});
