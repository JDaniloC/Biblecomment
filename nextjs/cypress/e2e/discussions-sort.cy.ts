/**
 * Sort selector on the discussion lists (Phase 3.7).
 *
 * The per-book list (/discussion/[abbrev]) is the deterministic surface to
 * assert against: the selector is URL-driven (?sort=...) and the page is
 * server-rendered, so the order in the DOM is exactly the DB order.
 *
 * Setup: one anchor comment, two discussions A (older) then B (newer). We give
 * A more stored likes than B via cy.task("db:setDiscussionLikeCount") — the
 * list/sort endpoints read the pre-aggregated `likeCount` counter (Phase 3.5),
 * so this makes "Mais curtidas" ordering deterministic without driving the
 * like UI. Expected:
 *   - recent (default) → newest first → B before A.
 *   - liked            → most-liked first → A before B.
 */

import users from "../fixtures/users.json";
import bookFixture from "../fixtures/book-gn.json";

const COMMENT_TEXT = "No princípio Deus criou os céus e a terra.";

describe("Discussions — sort selector", () => {
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

	it("per-book list orders by recent (default) and by likes when selected", () => {
		cy.loginAs(users.alice.email, users.alice.password);

		seedAnchorComment().then((commentId) => {
			// A is created first, B second → B is the newer thread.
			createDiscussion(commentId, "Discussão A").then((idA) => {
				createDiscussion(commentId, "Discussão B").then((idB) => {
					// A gets more stored likes than B so the "liked" order differs
					// from the default "recent" order (which is newest-first → B).
					cy.task("db:setDiscussionLikeCount", {
						discussionId: idA,
						likeCount: 5,
					});
					cy.task("db:setDiscussionLikeCount", {
						discussionId: idB,
						likeCount: 1,
					});

					// Default (recent): newest first → B before A.
					cy.visit("/discussion/gn");
					cy.get('[data-testid="discussions-sort"]').should("be.visible");
					cy.get('[data-testid="sort-recent"]').should(
						"have.attr",
						"aria-pressed",
						"true",
					);
					cy.get('[data-testid="discussion-card"]')
						.first()
						.should("contain", "Discussão B");

					// Switch to "Mais curtidas": most-liked first → A before B.
					cy.get('[data-testid="sort-liked"]').click();
					cy.url().should("include", "sort=liked");
					cy.get('[data-testid="sort-liked"]').should(
						"have.attr",
						"aria-pressed",
						"true",
					);
					cy.get('[data-testid="discussion-card"]')
						.should("have.length", 2)
						.first()
						.should("contain", "Discussão A");
				});
			});
		});
	});

	it("global list renders the selector and switches sort without errors", () => {
		cy.loginAs(users.alice.email, users.alice.password);

		seedAnchorComment().then((commentId) => {
			createDiscussion(commentId, "Discussão Global A").then(() => {
				createDiscussion(commentId, "Discussão Global B").then(() => {
					cy.visit("/discussions");
					cy.get('[data-testid="discussions-sort"]').should("be.visible");
					cy.get('[data-testid="sort-recent"]').should(
						"have.attr",
						"aria-pressed",
						"true",
					);
					cy.get('[data-testid="discussion-card"]').should(
						"have.length.at.least",
						2,
					);

					// Clicking a pill reloads the client-fetched list with the new sort.
					cy.get('[data-testid="sort-liked"]').click();
					cy.get('[data-testid="sort-liked"]').should(
						"have.attr",
						"aria-pressed",
						"true",
					);
					cy.get('[data-testid="discussion-card"]').should(
						"have.length.at.least",
						2,
					);
				});
			});
		});
	});
});
