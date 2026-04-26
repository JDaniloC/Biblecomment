/**
 * @username mention parsing + notification creation. STUB.
 *
 * Coverage to write:
 *
 *  - Alice POSTs a comment with text "Hello @bob, what do you think?".
 *    Bob's GET /api/notifications should show 1 unread with
 *    type: "comment_mention", actor: "alice", url pointing to the verse.
 *  - The same comment creates ZERO notifications for "@ghost" who doesn't
 *    exist (NotifyMentionsUseCase filters via findByUsernames).
 *  - Self-mention "@alice" by Alice creates ZERO notifications (filtered
 *    by NotifyMentionsUseCase).
 *  - Multiple mentions in one text "@bob @mod" → 2 notifications, one per user.
 *  - Mentions in discussion answers (PATCH /api/discussion/gn/<id>) trigger
 *    notifications with type: "answer_mention".
 *  - Email-shaped strings ("foo@bar.com") do NOT trigger mentions
 *    (parseMentions has the [^\w@] guard).
 */

import users from "../fixtures/users.json";
import bookFixture from "../fixtures/book-gn.json";

describe.skip("@mentions — comment + answer flows (TODO)", () => {
  beforeEach(() => {
    cy.resetDb();
    cy.seedDb({
      users: [users.alice, users.bob, users.mod],
      books: [bookFixture.book],
      verses: bookFixture.verses,
    });
  });

  it("@bob in Alice's comment creates exactly one notification for Bob", () => {
    // TODO: implement
  });
});
