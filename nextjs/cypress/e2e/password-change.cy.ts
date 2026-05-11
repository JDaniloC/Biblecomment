/**
 * POST /api/users/me/password — change/rotate password.
 *
 * Verifies the same matrix the unit tests cover (auth gate, current-password
 * verification, validation, post-change login), but end-to-end through
 * HTTP + Mongo + NextAuth handshake.
 */

import users from "../fixtures/users.json";

describe("Password change", () => {
  beforeEach(() => {
    cy.resetDb();
    cy.seedDb({ users: [users.alice, users.bob] });
  });

  describe("auth + validation", () => {
    it("anonymous → 401", () => {
      cy.request({
        method: "POST",
        url: "/api/users/me/password",
        body: { currentPassword: "x", newPassword: "yyyyyy" },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(401);
      });
    });

    it("rejects too-short newPassword with 400", () => {
      cy.loginAs(users.alice.email, users.alice.password);
      cy.request({
        method: "POST",
        url: "/api/users/me/password",
        body: { currentPassword: users.alice.password, newPassword: "abc" },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(400);
        expect(res.body).to.have.property("error", "Validation failed");
      });
    });

    it("rejects when newPassword equals currentPassword", () => {
      cy.loginAs(users.alice.email, users.alice.password);
      cy.request({
        method: "POST",
        url: "/api/users/me/password",
        body: {
          currentPassword: users.alice.password,
          newPassword: users.alice.password,
        },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(400);
      });
    });

    it("rejects when currentPassword doesn't match → 403", () => {
      cy.loginAs(users.alice.email, users.alice.password);
      cy.request({
        method: "POST",
        url: "/api/users/me/password",
        body: { currentPassword: "totally-wrong", newPassword: "shiny-new-pass" },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(403);
      });
    });
  });

  describe("happy path", () => {
    it("rotates the password — new one logs in, old one no longer does", () => {
      const newPass = "rotated-pass-2026";

      cy.loginAs(users.alice.email, users.alice.password);
      cy.request({
        method: "POST",
        url: "/api/users/me/password",
        body: { currentPassword: users.alice.password, newPassword: newPass },
      }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.have.property("success", true);
      });

      // New session: clear cookies and try the OLD password — must fail.
      cy.clearCookies();
      cy.request("/api/auth/csrf").then((csrfRes) => {
        const csrfToken = csrfRes.body.csrfToken as string;
        cy.request({
          method: "POST",
          url: "/api/auth/callback/credentials",
          form: true,
          body: {
            email: users.alice.email,
            password: users.alice.password,
            csrfToken,
            callbackUrl: "/home",
            json: "true",
          },
          followRedirect: false,
          failOnStatusCode: false,
        }).then((loginRes) => {
          if (
            loginRes.body &&
            typeof loginRes.body === "object" &&
            typeof loginRes.body.url === "string"
          ) {
            expect(
              loginRes.body.url,
              "old password must be rejected after rotation",
            ).to.match(/\/api\/auth\/error/);
          }
        });
      });

      // And the NEW password should now log in cleanly.
      cy.clearCookies();
      cy.loginAs(users.alice.email, newPass);
      cy.request("/api/users/me").its("status").should("eq", 200);
    });
  });
});
