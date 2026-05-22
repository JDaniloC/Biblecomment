/**
 * Guided page tours (driver.js) on /home, /communities, /discussions and
 * /profile. Each tour auto-opens on first visit, stays closed once the
 * server says the user finished it, and reopens via ?tour=1 — which the
 * "Refazer" buttons in /profile → Configurações use.
 *
 * Assertions key on driver.js's stable DOM hooks (.driver-popover, the
 * brand popoverClass `bc-tutorial`) plus our own data-tour / data-testid.
 */

import users from "../fixtures/users.json";
import bookFixture from "../fixtures/book-gn.json";

const POPOVER = ".driver-popover.bc-tutorial";

/** Every page tour + a stable post-hydration marker element. */
const PAGES = [
	{
		name: "home-v1",
		path: "/home",
		title: /tela inicial/i,
		marker: '[data-tour="home-books"]',
	},
	{
		name: "communities-v1",
		path: "/communities",
		title: /Comunidades/i,
		marker: '[data-tour="communities-search"]',
	},
	{
		name: "discussions-v1",
		path: "/discussions",
		title: /Discussões/i,
		marker: '[data-tour="discussions-list"]',
	},
	{
		name: "profile-v1",
		path: "/profile",
		title: /Seu perfil/i,
		marker: '[data-tour="profile-user-card"]',
	},
] as const;

const ALL_NAMES = PAGES.map((p) => p.name);

describe("Page tutorials", () => {
	beforeEach(() => {
		cy.resetDb();
	});

	/** Seed alice with a chosen set of finished tutorials and sign her in. */
	function seedAlice(completed: readonly string[]) {
		cy.seedDb({
			users: [{ ...users.alice, tutorialsCompleted: [...completed] }],
			books: [bookFixture.book],
			verses: bookFixture.verses,
		});
		cy.loginAs(users.alice.email, users.alice.password);
		// Cypress isolates localStorage per spec since v12; explicit clear
		// keeps the first-visit assertions deterministic on local re-runs.
		cy.clearLocalStorage();
	}

	PAGES.forEach(({ name, path, title, marker }) => {
		describe(path, () => {
			it("auto-opens on first visit", () => {
				seedAlice([]);
				cy.visit(path);
				cy.get(POPOVER, { timeout: 10000 }).should("be.visible");
				cy.contains(".driver-popover-title", title).should("be.visible");
			});

			it("stays closed once the server says it is completed", () => {
				seedAlice([name]);
				cy.visit(path);
				// Wait for hydration (the auto-start effect runs at mount) before
				// asserting the popover never appeared.
				cy.get(marker, { timeout: 10000 }).should("be.visible");
				cy.get(".driver-popover").should("not.exist");
			});

			it("?tour=1 forces it open even after completion", () => {
				seedAlice([name]);
				cy.visit(`${path}?tour=1`);
				cy.get(POPOVER, { timeout: 10000 }).should("be.visible");
				cy.contains(".driver-popover-title", title).should("be.visible");
			});
		});
	});

	it("the /profile tour switches to the Conquistas tab mid-tour", () => {
		seedAlice([]);
		cy.visit("/profile");
		cy.get(POPOVER, { timeout: 10000 }).should("be.visible");

		// welcome → user card → visão geral → conquistas
		cy.get(".driver-popover-next-btn").click();
		cy.get(".driver-popover-next-btn").click();
		cy.get(".driver-popover-next-btn").click();

		cy.contains(".driver-popover-title", /Conquistas/i).should("be.visible");
		cy.get('[data-tour="profile-tab-badges"]').should(
			"have.attr",
			"aria-current",
			"page",
		);
	});

	describe("Tutoriais guiados card", () => {
		it("lists every tutorial in /profile → Configurações", () => {
			// All finished so no tour auto-opens over the card.
			seedAlice(ALL_NAMES);
			cy.visit("/profile?tab=config");
			cy.get('[data-testid="tutorials-list"] li').should(
				"have.length",
				PAGES.length + 1, // the four page tours + the chapter tour
			);
		});

		it("Refazer re-opens a tour on its own page", () => {
			seedAlice(ALL_NAMES);
			cy.visit("/profile?tab=config");

			cy.get('[data-testid="tutorial-replay-discussions-v1"]').click();

			cy.location("pathname").should("eq", "/discussions");
			cy.location("search").should("eq", "?tour=1");
			cy.get(POPOVER, { timeout: 10000 }).should("be.visible");
			cy.contains(".driver-popover-title", /Discussões/i).should("be.visible");
		});
	});
});
