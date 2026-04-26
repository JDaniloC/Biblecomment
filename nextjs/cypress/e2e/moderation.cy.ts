/**
 * Moderator-only endpoints: report list, clear reports, set moderator. STUB.
 *
 * Coverage to write:
 *
 *  - GET /api/moderation/reports without session → 401.
 *  - GET /api/moderation/reports as Alice (regular) → 403.
 *  - GET /api/moderation/reports as mod → 200 with paginated items array
 *    of comments where reports.length > 0.
 *  - DELETE /api/moderation/reports/<commentId> as Alice → 403.
 *  - DELETE /api/moderation/reports/<commentId> as mod → 200, sets
 *    reports: [] (audit log entry visible in pino output).
 *  - PATCH /api/users/moderator as Alice (regular) → 403.
 *  - PATCH /api/users/moderator as mod with { email: bob, moderator: true }
 *    → 200, Bob's session next time has moderator: true.
 *  - PATCH /api/users/moderator with non-existent email → 404.
 */

import users from "../fixtures/users.json";

describe.skip("Moderation endpoints — RBAC + actions (TODO)", () => {
  beforeEach(() => {
    cy.resetDb();
    cy.seedDb({ users: [users.alice, users.bob, users.mod] });
  });

  it("only moderators can list reported comments and clear reports", () => {
    // TODO: implement
  });

  it("PATCH /api/users/moderator promotes another user", () => {
    // TODO: implement
  });
});
