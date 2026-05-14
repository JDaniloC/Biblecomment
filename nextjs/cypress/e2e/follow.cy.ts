/**
 * Follow / Unfollow + "Seguindo" home feed.
 *
 * - On /u/{other}: the Seguir button toggles to Seguindo and updates the
 *   followers counter optimistically. On reload, server-side state reflects
 *   the change (SSR fetches via GetFollowStateUseCase).
 * - On /u/{me}: no Seguir button — you can't follow yourself.
 * - Home Seguindo tab: empty when not following anyone; shows only comments
 *   authored by followed users when there are matches.
 */

import users from "../fixtures/users.json";
import bookFixture from "../fixtures/book-gn.json";

describe("Follow flow", () => {
  beforeEach(() => {
    cy.resetDb();
    cy.seedDb({
      users: [users.alice, users.bob],
      books: [bookFixture.book],
      verses: bookFixture.verses,
    });
    cy.loginAs(users.alice.email, users.alice.password);
  });

  it("toggles Seguir → Seguindo and bumps the followers counter", () => {
    cy.visit(`/u/${users.bob.username}`);

    cy.get('[data-testid="public-profile-follow-button"]')
      .should("have.attr", "data-following", "false")
      .and("contain.text", "Seguir");
    cy.get('[data-testid="public-profile-followers"]').should("contain.text", "0");

    cy.get('[data-testid="public-profile-follow-button"]').click();

    cy.get('[data-testid="public-profile-follow-button"]')
      .should("have.attr", "data-following", "true")
      .and("contain.text", "Seguindo");
    cy.get('[data-testid="public-profile-followers"]').should("contain.text", "1");
  });

  it("unfollow brings counter back down", () => {
    cy.visit(`/u/${users.bob.username}`);
    cy.get('[data-testid="public-profile-follow-button"]').click();
    cy.get('[data-testid="public-profile-follow-button"]').should(
      "have.attr",
      "data-following",
      "true",
    );

    cy.get('[data-testid="public-profile-follow-button"]').click();

    cy.get('[data-testid="public-profile-follow-button"]').should(
      "have.attr",
      "data-following",
      "false",
    );
    cy.get('[data-testid="public-profile-followers"]').should("contain.text", "0");
  });

  it("does not show the Seguir button on your own profile", () => {
    cy.visit(`/u/${users.alice.username}`);
    cy.get('[data-testid="public-profile-follow-button"]').should("not.exist");
  });

  it("home Seguindo tab is empty when alice follows nobody", () => {
    cy.visit("/home");
    cy.contains('[role="tab"]', "Seguindo").click();
    cy.contains("Você ainda não segue ninguém").should("be.visible");
  });

  it("sends a notification to the followed user (once, not on re-follow)", () => {
    // Alice follows bob.
    cy.visit(`/u/${users.bob.username}`);
    cy.get('[data-testid="public-profile-follow-button"]').click();
    cy.get('[data-testid="public-profile-follow-button"]').should(
      "have.attr",
      "data-following",
      "true",
    );

    // Switch to bob and check his notifications list.
    cy.clearCookies();
    cy.loginAs(users.bob.email, users.bob.password);
    cy.request("/api/notifications?page=1").then((res) => {
      expect(res.status).to.eq(200);
      const items = (res.body as { items: Array<{ type: string; actor: string; url: string }> }).items;
      const followNotifs = items.filter((n) => n.type === "new_follower");
      expect(followNotifs).to.have.length(1);
      expect(followNotifs[0].actor).to.eq(users.alice.username);
      expect(followNotifs[0].url).to.eq(`/u/${users.alice.username}`);
    });

    // Alice unfollows and re-follows — bob still has exactly one notification
    // (re-following must not duplicate the alert).
    cy.clearCookies();
    cy.loginAs(users.alice.email, users.alice.password);
    cy.visit(`/u/${users.bob.username}`);
    cy.get('[data-testid="public-profile-follow-button"]').click(); // unfollow
    cy.get('[data-testid="public-profile-follow-button"]').should(
      "have.attr",
      "data-following",
      "false",
    );
    cy.get('[data-testid="public-profile-follow-button"]').click(); // re-follow
    cy.get('[data-testid="public-profile-follow-button"]').should(
      "have.attr",
      "data-following",
      "true",
    );

    cy.clearCookies();
    cy.loginAs(users.bob.email, users.bob.password);
    cy.request("/api/notifications?page=1").then((res) => {
      const items = (res.body as { items: Array<{ type: string }> }).items;
      expect(items.filter((n) => n.type === "new_follower")).to.have.length(1);
    });
  });

  it("home Seguindo tab shows comments from followed users only", () => {
    // Bob has a comment; charlie (not followed) has another. Following Bob
    // should restrict the feed to Bob's row.
    cy.task("db:seedComment", {
      username: users.bob.username,
      abbrev: bookFixture.book.abbrev,
      chapter: 1,
      verseNumber: 1,
      text: "Comentário do Bob — esse deve aparecer no Seguindo.",
      tags: ["devocional"],
    });

    // Follow bob.
    cy.visit(`/u/${users.bob.username}`);
    cy.get('[data-testid="public-profile-follow-button"]').click();
    cy.get('[data-testid="public-profile-follow-button"]').should(
      "have.attr",
      "data-following",
      "true",
    );

    cy.visit("/home");
    cy.contains('[role="tab"]', "Seguindo").click();

    cy.get('[data-testid="feed-following"]')
      .should("be.visible")
      .and("contain.text", "Comentário do Bob");
  });
});
