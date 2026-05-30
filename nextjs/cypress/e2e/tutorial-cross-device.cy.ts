/**
 * Server-side tutorial persistence — Phase 8.
 *
 * The chapter onboarding flag lives both in localStorage (per-device) and
 * in `User.tutorialsCompleted` (cross-device, loaded into the JWT at
 * login). These specs verify both directions:
 *
 *   1. A user already marked as completed on the server skips the tour
 *      on a fresh browser even with empty localStorage.
 *   2. Dismissing the tour persists the flag to the DB so a future
 *      device — or this device after a localStorage wipe — also skips it.
 *
 * baseUrl is bound to the orchestrator's port (default 5050) by
 * cypress.config.ts; loginAs talks to /api/auth directly so the JWT is
 * minted with whatever tutorialsCompleted the seed put in Mongo.
 */

import users from "../fixtures/users.json";
import bookFixture from "../fixtures/book-gn.json";

const STORAGE_KEY = "tutorial:chapter-v1:completed";
const TUTORIAL_NAME = "chapter-v1";

interface FoundUser {
  exists: boolean;
  passwordHashLength: number;
  username: string | null;
  tutorialsCompleted: string[];
}

describe("Tutorial cross-device persistence", () => {
  it("does NOT auto-open if the user finished the tutorial on another device (server flag)", () => {
    cy.resetDb();
    cy.seedDb({
      users: [{ ...users.alice, tutorialsCompleted: [TUTORIAL_NAME] }],
      books: [bookFixture.book],
      verses: bookFixture.verses,
    });
    cy.loginAs(users.alice.email, users.alice.password);
    // Simulate a fresh device: localStorage is empty, but the JWT carries
    // tutorialsCompleted from the seed, so initialFromServer short-circuits
    // useTutorial to "completed" without consulting the storage flag.
    cy.clearLocalStorage();

    cy.visit("/chapter/gn/1");
    cy.contains("No princípio", { timeout: 8000 }).should("be.visible");
    cy.get(".driver-popover").should("not.exist");
  });

  it("dismissing the tutorial persists the completion to the DB", () => {
    cy.resetDb();
    cy.seedDb({
      // Explicit empty list so the chapter tour auto-opens (db:seed defaults
      // an omitted value to ALL tour ids = nothing auto-opens).
      users: [{ ...users.alice, tutorialsCompleted: [] }],
      books: [bookFixture.book],
      verses: bookFixture.verses,
    });
    cy.loginAs(users.alice.email, users.alice.password);
    cy.clearLocalStorage();

    cy.visit("/chapter/gn/1");
    cy.get(".driver-popover.bc-tutorial", { timeout: 8000 }).should("be.visible");

    cy.get(".driver-popover-close-btn").click();
    cy.get(".driver-popover").should("not.exist");

    // markTutorialCompleted is fire-and-forget; poll the DB until the write
    // lands. cy.task itself isn't retry-aware, so wrap it in an explicit
    // recursive check with a deadline.
    const pollForFlag = (attempt: number): void => {
      cy.task<FoundUser>("db:findUser", users.alice.email).then((u) => {
        if (u.tutorialsCompleted.includes(TUTORIAL_NAME)) return;
        if (attempt > 10) {
          throw new Error(
            `tutorialsCompleted never picked up '${TUTORIAL_NAME}' (last value: ${JSON.stringify(u.tutorialsCompleted)})`,
          );
        }
        cy.wait(200);
        pollForFlag(attempt + 1);
      });
    };
    pollForFlag(0);
  });

  it("?tour=1 still opens the tour even if the server says completed (refazer flow)", () => {
    cy.resetDb();
    cy.seedDb({
      users: [{ ...users.alice, tutorialsCompleted: [TUTORIAL_NAME] }],
      books: [bookFixture.book],
      verses: bookFixture.verses,
    });
    cy.loginAs(users.alice.email, users.alice.password);
    cy.clearLocalStorage();

    cy.visit("/chapter/gn/1?tour=1");
    cy.get(".driver-popover.bc-tutorial", { timeout: 8000 }).should("be.visible");
  });
});
