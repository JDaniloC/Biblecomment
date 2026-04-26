/// <reference types="cypress" />

import type { SeedPayload } from "../tasks/db";

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Reset the test database. Must be MONGODB_URI != prod (enforced by the task).
       */
      resetDb(): Chainable<void>;

      /**
       * Insert fixtures directly into Mongo, bypassing the API.
       * Use this for setup-only data (users to log in as, books/verses to navigate to).
       * For data created by user actions (a comment they post), drive it through the UI/API
       * to actually exercise the production code path.
       */
      seedDb(payload: SeedPayload): Chainable<void>;

      /**
       * Programmatically log in via NextAuth credentials provider, no UI navigation.
       * The user must already exist (via seedDb) with this email/password.
       * Sets the session cookie so subsequent requests are authenticated.
       */
      loginAs(email: string, password: string): Chainable<void>;
    }
  }
}

Cypress.Commands.add("resetDb", () => {
  cy.task("db:reset");
});

Cypress.Commands.add("seedDb", (payload: SeedPayload) => {
  cy.task("db:seed", payload);
});

Cypress.Commands.add("loginAs", (email: string, password: string) => {
  // Hit the NextAuth credentials provider directly. We need the CSRF token first.
  cy.request("/api/auth/csrf").then((csrfRes) => {
    const csrfToken = csrfRes.body.csrfToken as string;
    cy.request({
      method: "POST",
      url: "/api/auth/callback/credentials",
      form: true,
      body: {
        email,
        password,
        csrfToken,
        callbackUrl: "/home",
        json: "true",
      },
      followRedirect: false,
    });
  });
});

export {};
