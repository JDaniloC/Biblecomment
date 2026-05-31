/**
 * Onboarding tour (driver.js) — auto-opens on first chapter visit,
 * persists "completed" in localStorage, reopens via ?tour=1 query.
 *
 * UI assertions key on driver.js's stable DOM hooks (.driver-popover,
 * .driver-popover-next-btn, .driver-popover-close-btn) plus the brand
 * popoverClass `bc-tutorial`.
 */

import users from "../fixtures/users.json";
import bookFixture from "../fixtures/book-gn.json";

const STORAGE_KEY = "tutorial:chapter-v1:completed";

describe("Onboarding tutorial (chapter)", () => {
	beforeEach(() => {
		cy.resetDb();
		cy.seedDb({
			// Explicit empty list = "no tours finished" so the chapter tour
			// auto-opens. (db:seed defaults an omitted value to ALL tour ids.)
			users: [{ ...users.alice, tutorialsCompleted: [] }],
			books: [bookFixture.book],
			verses: bookFixture.verses,
		});
		cy.loginAs(users.alice.email, users.alice.password);
		// Cypress isolates localStorage per spec by default since v12; explicit
		// clear keeps assertions deterministic across local re-runs.
		cy.clearLocalStorage();
	});

	it("auto-opens on first visit to a chapter", () => {
		cy.visit("/chapter/gn/1");
		cy.get(".driver-popover.bc-tutorial", { timeout: 8000 }).should(
			"be.visible",
		);
		cy.contains(".driver-popover-title", /Boas-vindas/i).should("be.visible");
	});

	it("forces the tour open via ?tour=1 even after dismissal", () => {
		cy.window().then((win) => win.localStorage.setItem(STORAGE_KEY, "1"));
		cy.visit("/chapter/gn/1");
		// Should NOT auto-open because the flag is set.
		cy.get(".driver-popover").should("not.exist");

		cy.visit("/chapter/gn/1?tour=1");
		// Gate on the redirect settling before polling for the popover so
		// we don't burn the timeout on the in-flight navigation. Verify
		// both path AND query — the redirect in chapter/[abbrev]/page.tsx
		// forwards query params, but a regression there would silently
		// drop ?tour=1 and break this assertion in a confusing way.
		cy.location("pathname", { timeout: 10000 }).should("eq", "/verses/gn/1");
		cy.location("search").should("eq", "?tour=1");
		cy.get(".driver-popover.bc-tutorial", { timeout: 15000 }).should(
			"be.visible",
		);
	});

	it("Próximo advances through steps", () => {
		cy.visit("/chapter/gn/1");
		cy.get(".driver-popover.bc-tutorial", { timeout: 8000 }).should(
			"be.visible",
		);
		cy.contains(".driver-popover-title", /Boas-vindas/i).should("be.visible");

		cy.get(".driver-popover-next-btn").click();
		cy.contains(".driver-popover-title", /Navegar pelos livros/i).should(
			"be.visible",
		);

		cy.get(".driver-popover-next-btn").click();
		cy.contains(".driver-popover-title", /Busca global/i).should("be.visible");
	});

	it("closing the popover sets the completed flag and prevents re-opening", () => {
		cy.visit("/chapter/gn/1");
		cy.get(".driver-popover.bc-tutorial", { timeout: 8000 }).should(
			"be.visible",
		);

		cy.get(".driver-popover-close-btn").click();
		cy.get(".driver-popover").should("not.exist");

		cy.window()
			.its("localStorage")
			.invoke("getItem", STORAGE_KEY)
			.should("eq", "1");

		// Reload — tour stays closed.
		cy.reload();
		cy.get(".driver-popover").should("not.exist");
	});

	it("does NOT auto-open if the user already completed the tutorial", () => {
		cy.window().then((win) => win.localStorage.setItem(STORAGE_KEY, "1"));
		cy.visit("/chapter/gn/1");
		// Give the page a beat to mount and the effect to potentially fire.
		cy.contains("No princípio", { timeout: 8000 }).should("be.visible");
		cy.get(".driver-popover").should("not.exist");
	});
});
