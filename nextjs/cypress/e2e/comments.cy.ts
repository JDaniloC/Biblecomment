/**
 * Comment lifecycle. STUB — fill in as the chapter UI stabilizes.
 *
 * Why stubbed: writing comments via the UI requires the chapter page's
 * compose form selectors, which are not yet ergonomic for testing
 * (lots of inline styles, no test ids). For now the use cases are
 * covered by Vitest. Once we ship CR-8 follow-up (Tailwind class
 * conversion) or add `data-testid` attributes, drive these via the UI.
 *
 * Coverage to write:
 *
 *  - Logged-in user creates a comment via POST /api/comments/[verseId]
 *    and sees it in GET /api/comments/verse/[abbrev]/[chapter]/[verse].
 *  - Owner can PATCH their own comment text.
 *  - Non-owner gets 403 when PATCHing someone else's comment (UpdateCommentUseCase
 *    throws "Unauthorized"; route maps to forbidden()).
 *  - Owner can DELETE their own comment.
 *  - Moderator can DELETE anyone's comment.
 *  - Non-owner non-moderator gets 403 on DELETE.
 *  - PATCH with action: "like" toggles the username in/out of likes.
 *  - PATCH with action: "report" adds username to reports (idempotent — $addToSet).
 *  - Validation: empty text returns 400 with "Validation failed".
 */

import users from "../fixtures/users.json";
import bookFixture from "../fixtures/book-gn.json";

describe.skip("Comments — full lifecycle (TODO)", () => {
  beforeEach(() => {
    cy.resetDb();
    cy.seedDb({
      users: [users.alice, users.bob, users.mod],
      books: [bookFixture.book],
      verses: bookFixture.verses,
    });
  });

  it("owner creates and edits, non-owner is rejected, moderator can delete", () => {
    // TODO: implement
  });
});
