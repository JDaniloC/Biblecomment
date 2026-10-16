/**
 * POST /api/users/me/password — change/rotate password.
 *
 * Verifies the same matrix the unit tests cover (auth gate, current-password
 * verification, validation, post-change login), but end-to-end through
 * HTTP + Mongo + NextAuth handshake.
 */

import users from "../fixtures/users.json";
import type { FoundUser } from "../tasks/db";

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

  // A change bumps the account's session version: every other session
  // ends, and the device that made the change is signed in again with the
  // new password (a new cookie on the same response).
  describe("sessions", () => {
    const newPass = "rotated-pass-2026";

    /** A replayed session that no longer authenticates anything. */
    function expectRevoked(session: Cypress.Cookie[], label: string) {
      cy.useSessionCookies(session);
      cy.request("/api/auth/session").then((res) =>
        expect(res.body, `${label}: /api/auth/session`).to.equal(null),
      );
      // The null session response clears the cookie, so replay it again.
      cy.useSessionCookies(session);
      cy.request({ method: "POST", url: "/api/me/reading-session", failOnStatusCode: false })
        .its("status")
        .should("eq", 401);
    }

    function changePassword(currentPassword: string) {
      return cy.request({
        method: "POST",
        url: "/api/users/me/password",
        body: { currentPassword, newPassword: newPass },
        failOnStatusCode: false,
      });
    }

    it("API change: the other session ends, this client keeps a fresh one", () => {
      cy.loginAs(users.alice.email, users.alice.password);
      cy.sessionCookies().then((other) => {
        expect(other, "session A (another device)").to.not.be.empty;
        cy.clearCookies();
        cy.loginAs(users.alice.email, users.alice.password);

        cy.sessionCookies().then((before) => {
          changePassword(users.alice.password).then((res) => {
            expect(res.status).to.eq(200);
            expect(res.body).to.deep.eq({ success: true, sessionKept: true });
          });
          cy.task<FoundUser>("db:findUser", users.alice.email)
            .its("sessionVersion")
            .should("eq", 1);

          cy.sessionCookies().then((after) => {
            expect(after, "a new session cookie for this client").to.not.be.empty;
            expect(after.map((c) => c.value).join()).to.not.eq(
              before.map((c) => c.value).join(),
            );

            // This client's new session works, at the new version.
            cy.useSessionCookies(after);
            cy.request("/api/auth/session").then((s) => {
              expect(s.body?.user?.email).to.eq(users.alice.email);
              expect(s.body?.user?.sessionVersion).to.eq(1);
            });
            cy.request("POST", "/api/me/reading-session").its("status").should("eq", 200);

            expectRevoked(other, "the other device");
            expectRevoked(before, "this client's pre-change cookie");

            cy.useSessionCookies(after);
            cy.request("POST", "/api/me/reading-session").its("status").should("eq", 200);
          });
        });
      });
    });

    it("a wrong current password revokes nothing", () => {
      cy.loginAs(users.alice.email, users.alice.password);
      cy.sessionCookies().then((other) => {
        cy.clearCookies();
        cy.loginAs(users.alice.email, users.alice.password);
        changePassword("totally-wrong").its("status").should("eq", 403);

        cy.task<FoundUser>("db:findUser", users.alice.email)
          .its("sessionVersion")
          .should("eq", 0);
        cy.useSessionCookies(other);
        cy.request("POST", "/api/me/reading-session").its("status").should("eq", 200);
      });
    });

    it("UI change from the profile keeps this device signed in and ends the other session", () => {
      cy.loginAs(users.alice.email, users.alice.password);
      cy.sessionCookies().then((other) => {
        cy.clearCookies();
        cy.loginAs(users.alice.email, users.alice.password);

        cy.visit("/profile?tab=config");
        cy.get("#current-password").type(users.alice.password);
        cy.get("#new-password").type(newPass);
        cy.get("#confirm-new-password").type(newPass);
        cy.contains("button", "Atualizar senha").click();
        cy.contains("Senha atualizada. As outras sessões foram encerradas.").should(
          "be.visible",
        );
        cy.task<FoundUser>("db:findUser", users.alice.email)
          .its("sessionVersion")
          .should("eq", 1);

        // Still signed in on this device: /profile renders instead of
        // redirecting to /login, and a session-gated write goes through.
        cy.reload();
        cy.location("pathname").should("eq", "/profile");
        cy.request("POST", "/api/me/reading-session").its("status").should("eq", 200);

        expectRevoked(other, "the other device");
      });
    });

    it("cancels a pending e-mail change: its confirmation link stops working", () => {
      const newEmail = "alice-new@cypress.test";
      const rawToken = "pending-email-change-token";
      cy.resetDb();
      cy.seedDb({ users: [{ ...users.alice, pendingEmail: newEmail }] });
      cy.task("db:insertEmailVerificationToken", {
        email: users.alice.email,
        rawToken,
        tokenEmail: newEmail,
        expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
      });
      cy.task<FoundUser>("db:findUser", users.alice.email)
        .its("pendingEmail")
        .should("eq", newEmail);

      cy.loginAs(users.alice.email, users.alice.password);
      changePassword(users.alice.password).its("status").should("eq", 200);

      cy.task<FoundUser>("db:findUser", users.alice.email)
        .its("pendingEmail")
        .should("be.null");

      // The token itself survives; clearing pendingEmail is what kills it.
      cy.visit(`/verify-email?token=${rawToken}`);
      cy.get('[data-testid="verify-email-confirm"]').click();
      cy.get('[data-testid="verify-email-error"]').should("be.visible");
      cy.task<FoundUser>("db:findUser", newEmail).its("exists").should("eq", false);
      cy.task<FoundUser>("db:findUser", users.alice.email).its("exists").should("eq", true);
    });

    it("keeps a first-time verification link working", () => {
      const rawToken = "first-time-verification-token";
      cy.resetDb();
      cy.seedDb({ users: [{ ...users.alice, emailVerified: false }] });
      cy.task("db:insertEmailVerificationToken", {
        email: users.alice.email,
        rawToken,
        tokenEmail: users.alice.email,
        expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
      });

      cy.loginAs(users.alice.email, users.alice.password);
      changePassword(users.alice.password).its("status").should("eq", 200);

      cy.visit(`/verify-email?token=${rawToken}`);
      cy.get('[data-testid="verify-email-confirm"]').click();
      cy.get('[data-testid="verify-email-success"]').should("be.visible");
    });
  });
});
