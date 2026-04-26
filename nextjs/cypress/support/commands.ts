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
  // Pre-flight: confirm the user is actually in the test DB with a bcrypt hash.
  // Without this, Auth.js's authorize() returns null and we get an opaque
  // CredentialsSignin error with no actionable info.
  cy.task<{
    exists: boolean;
    passwordHashLength: number;
    passwordType: string | null;
    username: string | null;
  }>("db:findUser", email).then((u) => {
    expect(u.exists, `loginAs(${email}) — user not in test DB. Forgot cy.seedDb()?`).to.be.true;
    expect(
      u.passwordType,
      `loginAs(${email}) — passwordType must be "bcrypt", got ${u.passwordType}`,
    ).to.eq("bcrypt");
    // bcrypt hashes are exactly 60 chars: $2[aby]$<cost>$<22-char salt><31-char hash>.
    expect(
      u.passwordHashLength,
      `loginAs(${email}) — stored password is not bcrypt-shaped (length ${u.passwordHashLength}, expected 60)`,
    ).to.eq(60);
  });

  cy.request("/api/auth/csrf").then((csrfRes) => {
    expect(csrfRes.status, "GET /api/auth/csrf").to.eq(200);
    const csrfToken = csrfRes.body.csrfToken as string;
    expect(csrfToken, "csrfToken from /api/auth/csrf").to.be.a("string").and.not.be.empty;

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
      failOnStatusCode: false,
    }).then((res) => {
      expect(
        res.status,
        `POST /api/auth/callback/credentials (got ${res.status})`,
      ).to.be.oneOf([200, 302]);

      if (res.body && typeof res.body === "object" && typeof res.body.url === "string") {
        expect(
          res.body.url,
          `loginAs(${email}) — Auth.js rejected creds (URL: ${res.body.url})`,
        ).to.not.match(/\/api\/auth\/error/);
      }
    });

    cy.getCookies().then((cookies) => {
      const session = cookies.find((c) =>
        /authjs\.session-token|next-auth\.session-token/.test(c.name),
      );
      expect(
        session,
        `loginAs(${email}) — expected a session cookie. ` +
          `Cookies: ${cookies.map((c) => c.name).join(", ") || "none"}`,
      ).to.exist;
    });
  });
});

export {};
