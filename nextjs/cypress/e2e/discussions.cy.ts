/**
 * Discussion lifecycle + answer notifications. STUB.
 *
 * Coverage to write:
 *
 *  - Alice POST /api/discussion/gn creates a discussion. Returns 201 with _id.
 *  - Bob PATCH /api/discussion/gn/<id> adds an answer. Returns 200 with the
 *    discussion + new answer in answers[].
 *  - After Bob's answer, Alice GET /api/notifications has unread >= 1 with
 *    type: "discussion_answer", actor: "bob", url: "/discussion/gn/<id>".
 *  - Alice answering her OWN discussion does NOT create a notification
 *    (CreateNotificationUseCase silently no-ops when actor === recipient).
 *  - Owner can DELETE their own discussion. Non-owner gets 403.
 *  - Moderator can DELETE any discussion.
 *  - Validation: empty question returns 400.
 */

import users from "../fixtures/users.json";
import bookFixture from "../fixtures/book-gn.json";

describe.skip("Discussions — create, answer, notify (TODO)", () => {
  beforeEach(() => {
    cy.resetDb();
    cy.seedDb({
      users: [users.alice, users.bob, users.mod],
      books: [bookFixture.book],
      verses: bookFixture.verses,
    });
  });

  it("Bob answering Alice's discussion notifies Alice", () => {
    // TODO: implement
  });
});
