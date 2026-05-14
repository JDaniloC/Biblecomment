/**
 * Followers / Following list subpages + /profile counters.
 *
 * After alice follows bob:
 * - /u/bob/followers lists alice (and the public profile counter is clickable)
 * - /u/alice/following lists bob (mirror side of the same row)
 * - /profile shows alice's seguidores=0, seguindo=1 in the overview tab
 *   and the counters link to the same subpages
 */

import users from "../fixtures/users.json";

describe("Follow lists + /profile counters", () => {
  beforeEach(() => {
    cy.resetDb();
    cy.seedDb({ users: [users.alice, users.bob] });
    cy.loginAs(users.alice.email, users.alice.password);

    // Set up the follow relation via the UI (drives prod code path).
    cy.visit(`/u/${users.bob.username}`);
    cy.get('[data-testid="public-profile-follow-button"]').click();
    cy.get('[data-testid="public-profile-follow-button"]').should(
      "have.attr",
      "data-following",
      "true",
    );
  });

  it("clicking the public-profile followers counter opens the followers list", () => {
    cy.visit(`/u/${users.bob.username}`);
    cy.get('[data-testid="public-profile-followers"]').click();

    cy.location("pathname").should("eq", `/u/${users.bob.username}/followers`);
    cy.get('[data-testid="follow-list"]')
      .should("be.visible")
      .find(`[data-testid="follow-list-item-${users.alice.username}"]`)
      .should("be.visible");
  });

  it("clicking the public-profile following counter opens the following list", () => {
    cy.visit(`/u/${users.alice.username}`);
    cy.get('[data-testid="public-profile-following"]').click();

    cy.location("pathname").should("eq", `/u/${users.alice.username}/following`);
    cy.get('[data-testid="follow-list"]')
      .find(`[data-testid="follow-list-item-${users.bob.username}"]`)
      .should("be.visible");
  });

  it("empty state renders when the list has no entries", () => {
    // alice has zero followers (only bob exists and bob doesn't follow her).
    cy.visit(`/u/${users.alice.username}/followers`);
    cy.get('[data-testid="follow-list-empty"]').should("be.visible");
  });

  it("inline Seguir button on a list row toggles state", () => {
    // alice is viewing bob's followers — the only row is alice herself, so
    // no follow button. Switch to bob viewing his own followers list to
    // simulate following alice from there.
    cy.clearCookies();
    cy.loginAs(users.bob.email, users.bob.password);
    cy.visit(`/u/${users.bob.username}/followers`);

    // The row in bob's followers is alice. Button should read Seguir.
    cy.get(`[data-testid="follow-list-toggle-${users.alice.username}"]`)
      .should("have.attr", "data-following", "false")
      .and("contain.text", "Seguir")
      .click();

    cy.get(`[data-testid="follow-list-toggle-${users.alice.username}"]`)
      .should("have.attr", "data-following", "true")
      .and("contain.text", "Seguindo");
  });

  it("does not render a follow button on the viewer's own row", () => {
    // alice on her own following list — the row for the user she follows
    // (bob) gets a button, but if she were in some list with herself, no
    // button. We assert the negative case by checking alice's followers
    // page (only she appears in bob's list, so on her own followers page
    // there are no rows — empty). Use bob's view of alice's followers.
    cy.clearCookies();
    cy.loginAs(users.alice.email, users.alice.password);
    cy.visit(`/u/${users.bob.username}/followers`);

    // alice's row should NOT have a follow toggle — she is `isMe`.
    cy.get(`[data-testid="follow-list-item-${users.alice.username}"]`).should("exist");
    cy.get(`[data-testid="follow-list-toggle-${users.alice.username}"]`).should("not.exist");
  });

  it("/profile overview shows the social stats with counts and links", () => {
    cy.visit("/profile");

    cy.get('[data-testid="profile-social-stats"]').should("be.visible");
    cy.get('[data-testid="profile-followers-link"]')
      .should("have.attr", "href", `/u/${users.alice.username}/followers`)
      .and("contain.text", "0");
    cy.get('[data-testid="profile-following-link"]')
      .should("have.attr", "href", `/u/${users.alice.username}/following`)
      .and("contain.text", "1");

    cy.get('[data-testid="profile-following-link"]').click();
    cy.location("pathname").should("eq", `/u/${users.alice.username}/following`);
    cy.get(`[data-testid="follow-list-item-${users.bob.username}"]`).should("be.visible");
  });
});
