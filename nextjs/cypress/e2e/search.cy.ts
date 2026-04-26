/**
 * Search behavior — debounce, unified results, navigation. STUB.
 *
 * Coverage to write:
 *
 *  - Typing < 2 chars in the header search input does NOT fire a request.
 *  - Typing "princí" debounces 400ms and then hits /api/search/unified.
 *  - Result dropdown shows the seeded verse "Gn 1:1" with the matched
 *    substring highlighted.
 *  - Clicking a verse result navigates to /verses/gn/1#1.
 *  - Comments with matching text appear in the same dropdown under
 *    "Comentários" section.
 *  - Both Header (compact) and chapter-page (full-width) variants render
 *    the dropdown — they share the useUnifiedSearch hook so behavior
 *    should be identical.
 *  - The dropdown closes on outside click within ~150ms.
 */

import users from "../fixtures/users.json";
import bookFixture from "../fixtures/book-gn.json";

describe.skip("Search — unified results (TODO)", () => {
  beforeEach(() => {
    cy.resetDb();
    cy.seedDb({
      users: [users.alice],
      books: [bookFixture.book],
      verses: bookFixture.verses,
    });
  });

  it("debounces input, returns unified verses + comments, navigates on click", () => {
    // TODO: implement
  });
});
