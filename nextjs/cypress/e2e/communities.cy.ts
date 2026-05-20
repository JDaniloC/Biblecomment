/**
 * Communities listing / creation / join-leave / detail.
 *
 * Each test resets DB and seeds two users. Tests drive the real UI for
 * the golden paths and assert via DOM + API for the error branches
 * (3-cap, duplicate slug).
 */

import users from "../fixtures/users.json";

describe("Communities — Phase 4.2 (CRUD + join/leave)", () => {
  beforeEach(() => {
    cy.resetDb();
    cy.seedDb({ users: [users.alice, users.bob] });
  });

  it("alice creates a community via the form and lands on the detail page", () => {
    cy.loginAs(users.alice.email, users.alice.password);
    cy.visit("/communities");
    cy.get('[data-testid="community-create-link"]').click();

    cy.get('[data-testid="community-name-input"]').type("Reformados PT-BR");
    // Slug should auto-fill from the name.
    cy.get('[data-testid="community-slug-input"]').should(
      "have.value",
      "reformados-pt-br",
    );
    cy.get('[data-testid="community-description-input"]').type(
      "Comunidade para leitura reformada em português.",
    );
    cy.get('[data-testid="community-submit"]').click();

    cy.location("pathname").should("eq", "/communities/reformados-pt-br");
    cy.get('[data-testid="community-name"]').should(
      "contain.text",
      "Reformados PT-BR",
    );
    cy.get('[data-testid="community-creator-badge"]').should("be.visible");
  });

  it("listing shows the new community and search filters by name", () => {
    cy.loginAs(users.alice.email, users.alice.password);
    // Create two so we can filter.
    cy.request("POST", "/api/communities", {
      slug: "exegetas",
      name: "Exegetas",
      description: "Estudos exegéticos",
    });
    cy.request("POST", "/api/communities", {
      slug: "devocional",
      name: "Devocional Diário",
      description: "Leitura diária",
    });

    cy.visit("/communities");
    cy.get('[data-testid="community-card-exegetas"]').should("be.visible");
    cy.get('[data-testid="community-card-devocional"]').should("be.visible");

    cy.get('[data-testid="community-search-input"]').type("devo");
    cy.get('[data-testid="community-card-devocional"]').should("be.visible");
    cy.get('[data-testid="community-card-exegetas"]').should("not.exist");
  });

  it("bob requests entry to a community alice created and can cancel it", () => {
    // plan_community moved the join model from a single-button flip to
    // request → moderator approval. This test covers the half bob can
    // drive alone: status flips none → pending → none on cancel, and the
    // memberCount only changes after a moderator approves (covered
    // separately by the moderation specs).
    cy.loginAs(users.alice.email, users.alice.password);
    cy.request("POST", "/api/communities", {
      slug: "exegetas",
      name: "Exegetas",
      description: "",
    });
    cy.clearCookies();

    cy.loginAs(users.bob.email, users.bob.password);
    cy.visit("/communities/exegetas");
    cy.get('[data-testid="community-member-count"]').should("have.text", "0");
    cy.get('[data-testid="community-membership-toggle"]')
      .should("have.attr", "data-status", "none")
      .and("contain.text", "Solicitar entrada")
      .find("button")
      .click();

    cy.get('[data-testid="community-membership-toggle"]').should(
      "have.attr",
      "data-status",
      "pending",
    );
    cy.get('[data-testid="community-membership-toggle"]').should(
      "contain.text",
      "Cancelar",
    );
    // memberCount stays 0 — only approved memberships bump the counter.
    cy.get('[data-testid="community-member-count"]').should("have.text", "0");

    cy.get('[data-testid="community-membership-toggle"]')
      .find("button")
      .click();
    cy.get('[data-testid="community-membership-toggle"]').should(
      "have.attr",
      "data-status",
      "none",
    );
    cy.get('[data-testid="community-member-count"]').should("have.text", "0");
  });

  it("creator does not see a Join button on their own community", () => {
    cy.loginAs(users.alice.email, users.alice.password);
    cy.request("POST", "/api/communities", {
      slug: "alice-place",
      name: "Alice Place",
      description: "",
    });
    cy.visit("/communities/alice-place");
    cy.get('[data-testid="community-membership-toggle"]').should("not.exist");
    cy.get('[data-testid="community-creator-badge"]').should("be.visible");
  });

  it("blocks creating a 4th community for the same user (3-per-user cap)", () => {
    cy.loginAs(users.alice.email, users.alice.password);
    for (const slug of ["a-one", "a-two", "a-three"]) {
      cy.request("POST", "/api/communities", { slug, name: slug, description: "" });
    }
    cy.request({
      method: "POST",
      url: "/api/communities",
      body: { slug: "a-four", name: "a-four", description: "" },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(403);
      expect(res.body.error).to.match(/limite/i);
    });
  });

  it("rejects duplicate slugs with a 409", () => {
    cy.loginAs(users.alice.email, users.alice.password);
    cy.request("POST", "/api/communities", {
      slug: "shared",
      name: "Shared",
      description: "",
    });
    cy.clearCookies();
    cy.loginAs(users.bob.email, users.bob.password);
    cy.request({
      method: "POST",
      url: "/api/communities",
      body: { slug: "shared", name: "Other", description: "" },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(409);
    });
  });

  it("anonymous users see no Criar / Entrar controls", () => {
    cy.loginAs(users.alice.email, users.alice.password);
    cy.request("POST", "/api/communities", {
      slug: "public",
      name: "Public",
      description: "",
    });
    cy.clearCookies();
    cy.visit("/communities");
    cy.get('[data-testid="community-create-link"]').should("not.exist");
    cy.visit("/communities/public");
    cy.get('[data-testid="community-membership-toggle"]').should("not.exist");
  });
});
