/**
 * Search box + book-filter dropdown on the GLOBAL discussions list
 * (/discussions), Phase 4 Task B.
 *
 * The global list is client-fetched: the search input is debounced (~300ms)
 * and reloads via discussionsService.listAll(page, sort, q, book), which the
 * backend (Task A) filters by case-insensitive title+body substring and exact
 * book. We seed one anchor comment and two discussions with DISTINCT titles,
 * then drive the search input and assert the list narrows / restores.
 *
 * Book filter: the cypress fixtures only ship a single book (gn), so a real
 * "filter to a different book" assertion isn't feasible here without inventing
 * a second book corpus. We instead assert the dropdown renders the seeded book
 * option and that selecting "Todos os livros" keeps the list intact (lighter
 * assertion — see note inline).
 */

import users from "../fixtures/users.json";
import bookFixture from "../fixtures/book-gn.json";

const COMMENT_TEXT = "No princípio Deus criou os céus e a terra.";
const TITLE_A = "Graça e fé";
const TITLE_B = "Lei e profetas";

describe("Discussions — search + book filter (global list)", () => {
	beforeEach(() => {
		cy.resetDb();
		cy.seedDb({
			users: [users.alice].map((u) => ({
				...u,
				tutorialsCompleted: ["chapter-v1", "discussions-v1"],
			})),
			books: [bookFixture.book],
			verses: bookFixture.verses,
		});
	});

	/** Seed the anchor comment alice posts on gn 1:1 and yield its id. */
	function seedAnchorComment(): Cypress.Chainable<string> {
		return cy
			.task<{ id: string }>("db:seedComment", {
				username: "alice",
				abbrev: "gn",
				chapter: 1,
				verseNumber: 1,
				text: COMMENT_TEXT,
				tags: [],
			})
			.then((r) => r.id);
	}

	/** Create a discussion anchored to `commentId`; resolve to its id. */
	function createDiscussion(
		commentId: string,
		title: string,
	): Cypress.Chainable<string> {
		return cy
			.request({
				method: "POST",
				url: "/api/discussion/gn",
				body: { commentId, title, body: `Corpo de ${title}` },
			})
			.then((res) => {
				expect(res.status).to.eq(201);
				return res.body._id as string;
			});
	}

	it("narrows the list by search query and restores when cleared", () => {
		cy.loginAs(users.alice.email, users.alice.password);

		seedAnchorComment().then((commentId) => {
			createDiscussion(commentId, TITLE_A).then(() => {
				createDiscussion(commentId, TITLE_B).then(() => {
					cy.visit("/discussions");

					// Both discussions present initially.
					cy.get('[data-testid="discussion-card"]').should(
						"have.length.at.least",
						2,
					);
					cy.contains('[data-testid="discussion-card"]', TITLE_A).should(
						"exist",
					);
					cy.contains('[data-testid="discussion-card"]', TITLE_B).should(
						"exist",
					);

					// Type part of TITLE_A → list narrows to the matching card.
					cy.get('[data-testid="discussions-search"]').type("Graça");

					// Wait for the debounced (~300ms) reload to apply.
					cy.contains('[data-testid="discussion-card"]', TITLE_A).should(
						"exist",
					);
					cy.get('[data-testid="discussion-card"]').should("have.length", 1);
					cy.contains('[data-testid="discussion-card"]', TITLE_B).should(
						"not.exist",
					);

					// Clearing the search restores the full list.
					cy.get('[data-testid="discussions-search"]').clear();
					cy.get('[data-testid="discussion-card"]').should(
						"have.length.at.least",
						2,
					);
					cy.contains('[data-testid="discussion-card"]', TITLE_B).should(
						"exist",
					);
				});
			});
		});
	});

	it("renders the book-filter dropdown and keeps the list on 'Todos os livros'", () => {
		// Lighter assertion: the fixtures only seed one book (gn), so we can't
		// assert cross-book filtering here. We verify the dropdown renders the
		// seeded book option and that the default "Todos os livros" value keeps
		// the seeded discussions visible.
		cy.loginAs(users.alice.email, users.alice.password);

		seedAnchorComment().then((commentId) => {
			createDiscussion(commentId, TITLE_A).then(() => {
				cy.visit("/discussions");

				cy.get('[data-testid="discussions-book-filter"]')
					.should("be.visible")
					.within(() => {
						cy.contains("option", "Todos os livros").should("exist");
						cy.contains("option", bookFixture.book.name).should("exist");
					});

				// Default ("") = all → seeded discussion stays visible.
				cy.get('[data-testid="discussions-book-filter"]').should(
					"have.value",
					"",
				);
				cy.contains('[data-testid="discussion-card"]', TITLE_A).should("exist");
			});
		});
	});
});
