/**
 * Authentication flows: register / login / logout / private-route guard.
 *
 * Drives the UI for the user-facing happy paths so any visual regression
 * (e.g. login form selectors changing, redirects breaking) surfaces here.
 * For programmatic auth in other suites, prefer cy.loginAs() — it skips
 * the UI and is much faster.
 */

import users from "../fixtures/users.json";

describe("Authentication", () => {
  beforeEach(() => {
    cy.resetDb();
    cy.seedDb({ users: [users.alice] });
  });

  describe("Registration", () => {
    it("creates a new user and lets them log in immediately", () => {
      const email = `newuser-${Date.now()}@cypress.test`;
      const username = `newuser-${Date.now()}`;
      const password = "fresh-secret-123";

      // Register via API (UI tested separately if there's a register form spec).
      cy.request({
        method: "POST",
        url: "/api/users",
        body: { email, username, password },
      }).then((res) => {
        expect(res.status).to.eq(201);
        expect(res.body).to.have.property("email", email);
        expect(res.body).to.have.property("username", username);
        expect(res.body, "registration response must NOT include password").to.not.have.property(
          "password",
        );
      });

      // Confirm the new credentials log in.
      cy.loginAs(email, password);
      cy.request("/api/users/me").then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.have.property("username", username);
      });
    });

    it("rejects duplicate email with 409", () => {
      cy.request({
        method: "POST",
        url: "/api/users",
        body: {
          email: users.alice.email,
          username: "alice-copy",
          password: "another-pass-123",
        },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(409);
      });
    });

    it("rejects malformed email with 400", () => {
      cy.request({
        method: "POST",
        url: "/api/users",
        body: {
          email: "not-an-email",
          username: "ghost",
          password: "secret-123",
        },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(400);
        expect(res.body).to.have.property("error", "Validation failed");
      });
    });

    it("rejects too-short password with 400", () => {
      cy.request({
        method: "POST",
        url: "/api/users",
        body: {
          email: "shortpw@cypress.test",
          username: "shortpw",
          password: "abc",
        },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(400);
      });
    });
  });

  describe("Login UI", () => {
    it("logs in via the form and redirects to the protected area", () => {
      cy.visit("/login");
      cy.findByLabelText(/e-?mail/i).type(users.alice.email);
      cy.findByLabelText(/senha|password/i).type(users.alice.password);
      cy.findByRole("button", { name: /entrar|sign in|login/i }).click();

      // After successful login, NextAuth should redirect away from /login.
      cy.url({ timeout: 10000 }).should("not.include", "/login");
      cy.request("/api/users/me").its("status").should("eq", 200);
    });

    it("rejects bad credentials and stays on /login", () => {
      cy.visit("/login");
      cy.findByLabelText(/e-?mail/i).type(users.alice.email);
      cy.findByLabelText(/senha|password/i).type("wrong-password-on-purpose");
      cy.findByRole("button", { name: /entrar|sign in|login/i }).click();

      cy.url({ timeout: 5000 }).should("include", "/login");
    });
  });

  describe("Private route guard", () => {
    it("redirects unauthenticated visitors to /login", () => {
      cy.request({
        method: "GET",
        url: "/profile",
        followRedirect: false,
        failOnStatusCode: false,
      }).then((res) => {
        // Next.js redirect() emits 307. The Location header (or final URL)
        // must point at /login.
        const location = (res.headers["location"] as string | undefined) ?? "";
        const redirected = res.status === 307 || res.status === 302 || res.redirects?.length;
        expect(redirected, "expected a redirect for /profile").to.be.ok;
        expect(location + (res.redirects?.[0] ?? "")).to.match(/\/login/);
      });
    });

    it("allows access to /profile after login", () => {
      cy.loginAs(users.alice.email, users.alice.password);
      cy.visit("/profile");
      cy.url().should("include", "/profile");
    });
  });

  describe("Logout", () => {
    it("clears the session — /api/users/me returns 401 after signOut", () => {
      cy.loginAs(users.alice.email, users.alice.password);
      cy.request("/api/users/me").its("status").should("eq", 200);

      // NextAuth signOut endpoint.
      cy.request("/api/auth/csrf").then((csrfRes) => {
        const csrfToken = csrfRes.body.csrfToken as string;
        cy.request({
          method: "POST",
          url: "/api/auth/signout",
          form: true,
          body: { csrfToken, callbackUrl: "/" },
          followRedirect: false,
        });
      });

      cy.request({
        method: "GET",
        url: "/api/users/me",
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(401);
      });
    });
  });
});
