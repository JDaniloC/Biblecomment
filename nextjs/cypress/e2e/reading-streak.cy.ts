/**
 * Reading-streak banner on /home. Drives the real mark-as-read flow so
 * the streak reflects production state, then asserts the card's
 * data-streak / data-read-today attributes.
 */
import users from "../fixtures/users.json";
import bookFixture from "../fixtures/book-gn.json";

describe("Reading streak banner", () => {
	beforeEach(() => {
		cy.resetDb();
		cy.seedDb({
			users: [{ ...users.alice, tutorialsCompleted: ["chapter-v1"] }],
			books: [bookFixture.book],
			verses: bookFixture.verses,
		});
		cy.loginAs(users.alice.email, users.alice.password);
	});

	it("invites the user to start a streak when nothing has been read", () => {
		cy.visit("/home");
		cy.get("[data-testid='reading-streak-card']")
			.should("be.visible")
			.and("have.attr", "data-streak", "0")
			.and("have.attr", "data-read-today", "false");
		cy.get("[data-testid='reading-streak-card']").should(
			"contain.text",
			"Comece sua sequência",
		);
	});

	it("counts today's reading as a 1-day streak", () => {
		// Mark a chapter read through the real UI so the streak is computed
		// from a genuine UserChapterRead row.
		cy.visit("/verses/gn/1");
		cy.get("[data-testid='mark-as-read']").click();
		cy.get("[data-testid='mark-as-read']").should(
			"have.attr",
			"aria-pressed",
			"true",
		);

		cy.visit("/home");
		cy.get("[data-testid='reading-streak-card']")
			.should("have.attr", "data-streak", "1")
			.and("have.attr", "data-read-today", "true");
		cy.get("[data-testid='reading-streak-card']").should(
			"contain.text",
			"1 dia de leitura seguidos",
		);
	});
});
