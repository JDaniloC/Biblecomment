/**
 * Regression suite for the three vulnerabilities found in the original
 * /security-review and fixed during the consolidation:
 *
 *  1. GET /api/users used to be anonymous and returned every user's email
 *     (data exposure / enumeration). It now requires a session, and only
 *     moderators see the email field.
 *
 *  2. GET /api/backup/users used to ship the password hash for every
 *     user (credential disclosure to anyone with a moderator session).
 *     It now strips the password via BackupUsersUseCase.
 *
 *  3. POST /api/backup/users used to forward arbitrary fields straight
 *     into UserModel.create — a moderator could plant a backdoor row
 *     with moderator: true. It now whitelists fields via Zod, hardcodes
 *     moderator: false, and replaces the password with a placeholder
 *     bcrypt hash.
 *
 * Each `it` here pins one of those behaviors. If a future refactor
 * regresses any of them, this suite fails before the PR merges.
 */

import users from "../fixtures/users.json";

describe("Security regressions: IDOR & RBAC", () => {
  beforeEach(() => {
    cy.resetDb();
    cy.seedDb({
      users: [
        users.alice,
        users.bob,
        users.mod,
      ],
    });
  });

  describe("GET /api/users — must require a session", () => {
    it("rejects anonymous callers with 401", () => {
      cy.request({
        method: "GET",
        url: "/api/users?pages=1",
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(401);
      });
    });

    it("hides email from non-moderator authenticated callers", () => {
      cy.loginAs(users.alice.email, users.alice.password);
      cy.request("GET", "/api/users?pages=1").then((res) => {
        expect(res.status).to.eq(200);
        const body = res.body as Array<Record<string, unknown>>;
        expect(body.length).to.be.greaterThan(0);
        body.forEach((u) => {
          expect(u, "non-moderator response must not leak email").to.not.have.property("email");
          expect(u).to.have.property("username");
        });
      });
    });

    it("includes email when the caller is a moderator", () => {
      cy.loginAs(users.mod.email, users.mod.password);
      cy.request("GET", "/api/users?pages=1").then((res) => {
        expect(res.status).to.eq(200);
        const body = res.body as Array<Record<string, unknown>>;
        const aliceRow = body.find((u) => u.username === "alice");
        expect(aliceRow, "moderator response must include alice").to.exist;
        expect(aliceRow).to.have.property("email", users.alice.email);
      });
    });
  });

  describe("GET /api/backup/users — must NOT ship password hashes", () => {
    it("returns 403 for non-moderator callers", () => {
      cy.loginAs(users.alice.email, users.alice.password);
      cy.request({
        method: "GET",
        url: "/api/backup/users",
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(403);
      });
    });

    it("strips password from the moderator-visible payload", () => {
      cy.loginAs(users.mod.email, users.mod.password);
      cy.request("GET", "/api/backup/users").then((res) => {
        expect(res.status).to.eq(200);
        const body = res.body as Array<Record<string, unknown>>;
        expect(body.length).to.be.greaterThan(0);
        body.forEach((u) => {
          expect(u, "backup must never include password").to.not.have.property("password");
        });
      });
    });
  });

  describe("POST /api/backup/users — must reject mass-assignment", () => {
    it("ignores moderator/password fields in the request body", () => {
      cy.loginAs(users.mod.email, users.mod.password);
      const malicious = {
        users: [
          {
            email: "backdoor@cypress.test",
            username: "backdoor",
            state: "X",
            belief: "Y",
            // Attacker-controlled field that the old code accepted:
            moderator: true,
          },
        ],
      };

      cy.request({
        method: "POST",
        url: "/api/backup/users",
        body: malicious,
      }).then((res) => {
        expect(res.status).to.be.oneOf([200, 201]);
      });

      // Verify the row that landed in Mongo doesn't carry any of the
      // attacker-controlled fields. The most direct check is the
      // moderator-only backup endpoint, which surfaces moderator status
      // (but not password — see the spec above).
      cy.request("GET", "/api/backup/users").then((res) => {
        const inserted = (res.body as Array<Record<string, unknown>>).find(
          (u) => u.username === "backdoor",
        );
        expect(inserted, "backdoor user should exist").to.exist;
        expect(inserted, "moderator flag must be hard-coded false").to.have.property(
          "moderator",
          false,
        );
      });

      // The acid test: try to log in with any guessed password. Auth must
      // reject it because the route always replaces the hash with a random
      // bcrypt placeholder. We can't use cy.loginAs here — its pre-flight
      // asserts the user logs in successfully, which is the opposite of
      // what we want.
      cy.clearCookies(); // drop the moderator session before the attempt

      cy.request("/api/auth/csrf").then((csrfRes) => {
        expect(csrfRes.status).to.eq(200);
        const csrfToken = csrfRes.body.csrfToken as string;

        cy.request({
          method: "POST",
          url: "/api/auth/callback/credentials",
          form: true,
          body: {
            email: "backdoor@cypress.test",
            password: "password",
            csrfToken,
            callbackUrl: "/home",
            json: "true",
          },
          followRedirect: false,
          failOnStatusCode: false,
        }).then((loginRes) => {
          // Auth.js with json:true returns 200 with body.url pointing
          // at /api/auth/error?error=CredentialsSignin when creds are
          // rejected. Any other shape means our defense isn't holding.
          if (
            loginRes.body &&
            typeof loginRes.body === "object" &&
            typeof loginRes.body.url === "string"
          ) {
            expect(
              loginRes.body.url,
              "guessed password against placeholder hash must be rejected",
            ).to.match(/\/api\/auth\/error/);
          }
        });
      });

      // Acid test #2: no session cookie was issued for the planted user.
      cy.getCookies().then((cookies) => {
        const session = cookies.find((c) =>
          /authjs\.session-token|next-auth\.session-token/.test(c.name),
        );
        expect(
          session,
          `planted backdoor must NOT yield a session cookie. Cookies: ${cookies
            .map((c) => c.name)
            .join(", ") || "none"}`,
        ).to.not.exist;
      });
    });
  });

  describe("CR-1 — username uniqueness enforced at DB level", () => {
    it("rejects a second registration with the same username (race-safe)", () => {
      // First registration succeeds.
      cy.request({
        method: "POST",
        url: "/api/users",
        body: {
          email: "first@cypress.test",
          username: "duplicate",
          password: "first-secret-12",
          acceptedTerms: true,
        },
      }).then((res) => {
        expect(res.status).to.eq(201);
      });

      // Second registration with the same username must fail.
      cy.request({
        method: "POST",
        url: "/api/users",
        body: {
          email: "second@cypress.test",
          username: "duplicate",
          password: "second-secret-12",
          acceptedTerms: true,
        },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(409);
      });
    });
  });
});
