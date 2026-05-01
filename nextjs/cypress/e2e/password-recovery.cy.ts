/**
 * Password recovery — /forgot-password → email link → /reset-password → /login.
 *
 * Run-time relies on the in-memory email transport (EMAIL_TRANSPORT=memory),
 * which scripts/cy-test.js sets for every Cypress run. The email is captured
 * in process memory and read back via GET /api/dev/last-email?email=…,
 * giving the spec the reset URL the user would click.
 */

import users from "../fixtures/users.json";

interface MemoryEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

function getResetLink(email: string): Cypress.Chainable<string> {
  return cy
    .request<{ message: MemoryEmail | null }>(`/api/dev/last-email?email=${encodeURIComponent(email)}`)
    .then((res) => {
      expect(res.status).to.eq(200);
      const msg = res.body.message;
      expect(msg, `email captured for ${email}`).to.not.be.null;
      const link = (msg as MemoryEmail).text.match(/https?:\/\/\S*\/reset-password\?token=[\w-]+/);
      expect(link, "reset link in email body").to.not.be.null;
      return cy.wrap((link as RegExpMatchArray)[0]);
    });
}

function clearInbox(): Cypress.Chainable<unknown> {
  return cy.request({ method: "DELETE", url: "/api/dev/last-email", failOnStatusCode: false });
}

describe("Password recovery", () => {
  beforeEach(() => {
    cy.resetDb();
    cy.seedDb({ users: [users.alice, users.bob] });
    clearInbox();
  });

  describe("/forgot-password", () => {
    it("known email → 200, token created, email captured in memory", () => {
      cy.visit("/forgot-password");
      cy.get("#forgot-email").type(users.alice.email);
      cy.contains("button", /enviar/i).click();
      cy.get('[data-testid="forgot-success"]').should("be.visible");

      cy.task<number>("db:countResetTokens", users.alice.email).should("eq", 1);

      cy.request<{ message: MemoryEmail | null }>(
        `/api/dev/last-email?email=${encodeURIComponent(users.alice.email)}`,
      ).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body.message, "alice received email").to.not.be.null;
        expect((res.body.message as MemoryEmail).subject).to.match(/redefinição/i);
      });
    });

    it("unknown email → still 200, no token created, no email sent", () => {
      cy.visit("/forgot-password");
      cy.get("#forgot-email").type("ghost@nowhere.test");
      cy.contains("button", /enviar/i).click();
      cy.get('[data-testid="forgot-success"]').should("be.visible");

      cy.task<number>("db:countResetTokens", "ghost@nowhere.test").should("eq", 0);

      cy.request<{ message: MemoryEmail | null }>(
        `/api/dev/last-email?email=${encodeURIComponent("ghost@nowhere.test")}`,
      ).then((res) => {
        expect(res.body.message).to.be.null;
      });
    });
  });

  describe("/reset-password", () => {
    it("happy path: emailed link rotates the password and old creds stop working", () => {
      const newPassword = "freshly-rotated-2026";

      cy.visit("/forgot-password");
      cy.get("#forgot-email").type(users.alice.email);
      cy.contains("button", /enviar/i).click();
      cy.get('[data-testid="forgot-success"]').should("be.visible");

      getResetLink(users.alice.email).then((link) => {
        cy.visit(link);
        cy.get("#reset-password").type(newPassword);
        cy.get("#reset-password-confirm").type(newPassword);
        cy.contains("button", /redefinir/i).click();

        cy.location("pathname").should("eq", "/login");
        cy.location("search").should("contain", "reset=1");
        cy.get('[data-testid="reset-success"]').should("be.visible");
      });

      // Token must have been burned.
      cy.task<number>("db:countResetTokens", users.alice.email).should("eq", 0);

      // New password works.
      cy.clearCookies();
      cy.loginAs(users.alice.email, newPassword);
      cy.request("/api/users/me").its("status").should("eq", 200);

      // Old password no longer works.
      cy.clearCookies();
      cy.request("/api/auth/csrf").then((csrfRes) => {
        cy.request({
          method: "POST",
          url: "/api/auth/callback/credentials",
          form: true,
          body: {
            email: users.alice.email,
            password: users.alice.password,
            csrfToken: csrfRes.body.csrfToken as string,
            callbackUrl: "/home",
            json: "true",
          },
          followRedirect: false,
          failOnStatusCode: false,
        }).then((res) => {
          if (res.body && typeof res.body === "object" && typeof res.body.url === "string") {
            expect(res.body.url, "old password must be rejected").to.match(
              /\/api\/auth\/error/,
            );
          }
        });
      });
    });

    it("expired token → user-visible error, no password change", () => {
      const raw = "expired-token-fixture-abcdefg";
      cy.task("db:insertResetToken", {
        email: users.alice.email,
        rawToken: raw,
        expiresAt: new Date(Date.now() - 60_000).toISOString(),
      });

      cy.visit(`/reset-password?token=${raw}`);
      cy.get("#reset-password").type("brand-new-password");
      cy.get("#reset-password-confirm").type("brand-new-password");
      cy.contains("button", /redefinir/i).click();

      cy.contains(/inválido|expirado/i).should("be.visible");

      // Old password still works (no rotation).
      cy.clearCookies();
      cy.loginAs(users.alice.email, users.alice.password);
    });

    it("missing token → redirected to /forgot-password", () => {
      cy.visit("/reset-password");
      cy.location("pathname").should("eq", "/forgot-password");
    });

    it("token is single-use: second submit with the same link fails", () => {
      cy.visit("/forgot-password");
      cy.get("#forgot-email").type(users.alice.email);
      cy.contains("button", /enviar/i).click();
      cy.get('[data-testid="forgot-success"]').should("be.visible");

      getResetLink(users.alice.email).then((link) => {
        // First reset: succeeds.
        cy.visit(link);
        cy.get("#reset-password").type("first-reset-pass");
        cy.get("#reset-password-confirm").type("first-reset-pass");
        cy.contains("button", /redefinir/i).click();
        cy.location("pathname").should("eq", "/login");

        // Reuse the same link: must error.
        cy.visit(link);
        cy.get("#reset-password").type("second-attempt-pass");
        cy.get("#reset-password-confirm").type("second-attempt-pass");
        cy.contains("button", /redefinir/i).click();
        cy.contains(/inválido|expirado/i).should("be.visible");
      });
    });

    it("client-side validates that confirmation matches", () => {
      cy.task("db:insertResetToken", {
        email: users.alice.email,
        rawToken: "happy-fixture-token-xyz",
        expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
      });

      cy.visit("/reset-password?token=happy-fixture-token-xyz");
      cy.get("#reset-password").type("first-pass-123");
      cy.get("#reset-password-confirm").type("different-pass-456");
      cy.contains("button", /redefinir/i).click();

      cy.contains(/não coincidem/i).should("be.visible");
    });
  });

  describe("/login link", () => {
    it("/login surfaces an Esqueci minha senha link to /forgot-password", () => {
      cy.visit("/login");
      cy.contains("a", /esqueci minha senha/i)
        .should("have.attr", "href", "/forgot-password")
        .click();
      cy.location("pathname").should("eq", "/forgot-password");
    });
  });
});
