/**
 * Offline chapter reading. Two observable pieces:
 *  - `?offline=1` renders a session-free snapshot (no per-user UI) even
 *    for a logged-in user — that's what the SW caches.
 *  - The OfflineBanner appears while the device reports offline.
 *
 * The service worker's cache-and-serve behavior itself is verified
 * manually on a device — SW interception is too flaky to e2e reliably.
 */
import users from "../fixtures/users.json";
import bookFixture from "../fixtures/book-gn.json";

describe("Offline reading", () => {
	beforeEach(() => {
		cy.resetDb();
		cy.seedDb({
			users: [{ ...users.alice, tutorialsCompleted: ["chapter-v1"] }],
			books: [bookFixture.book],
			verses: bookFixture.verses,
		});
		cy.loginAs(users.alice.email, users.alice.password);
	});

	it("normal chapter page shows per-user UI for a logged-in reader", () => {
		cy.visit("/verses/gn/1");
		cy.get("[data-testid='mark-as-read']").should("exist");
	});

	it("?offline=1 renders a session-free snapshot — no per-user UI", () => {
		// Same logged-in session, but the snapshot variant must drop the
		// account-gated controls so a shared cache entry can't leak them.
		cy.visit("/verses/gn/1?offline=1");
		cy.contains("No princípio").should("be.visible"); // text still renders
		cy.get("[data-testid='mark-as-read']").should("not.exist");
	});

	it("shows the offline banner when the device goes offline", () => {
		cy.visit("/home");
		cy.get("[data-testid='offline-banner']").should("not.exist");

		// The banner reads navigator.onLine (the event alone carries no
		// state), so the test must flip it before dispatching.
		cy.window().then((win) => {
			Object.defineProperty(win.navigator, "onLine", {
				value: false,
				configurable: true,
			});
			win.dispatchEvent(new Event("offline"));
		});
		cy.get("[data-testid='offline-banner']")
			.should("be.visible")
			.and("contain.text", "offline");

		cy.window().then((win) => {
			Object.defineProperty(win.navigator, "onLine", {
				value: true,
				configurable: true,
			});
			win.dispatchEvent(new Event("online"));
		});
		cy.get("[data-testid='offline-banner']").should("not.exist");
	});
});
