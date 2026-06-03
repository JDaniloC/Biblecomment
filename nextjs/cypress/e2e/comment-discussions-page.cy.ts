/**
 * Per-comment discussions page — intermediate landing between a comment's
 * "Contribuir" action and the create form.
 *
 * Tapping "Contribuir" on a comment in the reader now navigates to
 * /discussion/[abbrev]/comment/[commentId], which renders a read-only snapshot
 * of the comment, a "Nova discussão" CTA, and either the empty state (no
 * threads yet) or a list of DiscussionCard links anchored to that comment.
 *
 * Mirrors discussion-restructure.cy.ts for seeding (tutorialsCompleted so the
 * chapter tour overlay doesn't intercept clicks), for opening a verse's comment
 * panel, and for creating a discussion via the real POST /api/discussion/gn
 * endpoint.
 */

import users from "../fixtures/users.json";
import bookFixture from "../fixtures/book-gn.json";

const COMMENT_TEXT = "No princípio Deus criou os céus e a terra.";

describe("Per-comment discussions page", () => {
	beforeEach(() => {
		cy.resetDb();
		cy.seedDb({
			// Mark the chapter tutorial complete so its full-screen coach-mark
			// overlay doesn't intercept clicks on the reader panel.
			users: [users.alice].map((u) => ({
				...u,
				tutorialsCompleted: ["chapter-v1"],
			})),
			books: [bookFixture.book],
			verses: bookFixture.verses,
		});
	});

	/** Seed an anchor comment on gn 1:1 (as alice) and resolve to its id string. */
	function seedAnchorComment() {
		return cy
			.task<{ id: string }>("db:seedComment", {
				username: "alice",
				abbrev: "gn",
				chapter: 1,
				verseNumber: 1,
				text: COMMENT_TEXT,
				tags: [],
			})
			.then((res) => res.id);
	}

	/** Open the verse-1 comment panel the way discussion-restructure.cy.ts does. */
	function openVerseOneSidebar() {
		cy.visit("/verses/gn/1");
		cy.get("li#1 button").first().click();
		cy.contains(COMMENT_TEXT).should("be.visible");
	}

	it("opens the per-comment page with snapshot, CTA, and empty state", () => {
		cy.loginAs(users.alice.email, users.alice.password);

		seedAnchorComment().then(() => {
			openVerseOneSidebar();

			// Tap "Contribuir" → the comment's discussions page.
			cy.get('[data-testid="comment-discuss"]').first().click();

			cy.url().should("include", "/discussion/gn/comment/");
			cy.get('[data-testid="comment-snapshot"]').should(
				"contain",
				COMMENT_TEXT,
			);
			cy.get('[data-testid="new-discussion"]').should("be.visible");
			cy.get('[data-testid="comment-discussions-empty"]').should("be.visible");
		});
	});

	it('"Nova discussão" leads to the create form', () => {
		cy.loginAs(users.alice.email, users.alice.password);

		seedAnchorComment().then(() => {
			openVerseOneSidebar();
			cy.get('[data-testid="comment-discuss"]').first().click();

			cy.get('[data-testid="new-discussion"]').click();
			cy.url().should("include", "/discussion/gn/new");
			cy.get('[data-testid="discussion-title-input"]').should("be.visible");
		});
	});

	it("lists an existing discussion anchored to the comment", () => {
		cy.loginAs(users.alice.email, users.alice.password);

		seedAnchorComment().then((commentId) => {
			// Create a discussion anchored to that comment via the real API.
			cy.request({
				method: "POST",
				url: "/api/discussion/gn",
				body: {
					commentId,
					title: "Discussão existente",
					body: "Corpo da discussão.",
				},
			}).then((res) => {
				expect(res.status).to.eq(201);
			});

			openVerseOneSidebar();
			cy.get('[data-testid="comment-discuss"]').first().click();

			cy.url().should("include", "/discussion/gn/comment/");
			cy.get('[data-testid="discussion-list"]').should("be.visible");
			cy.get('[data-testid="discussion-card"]')
				.should("exist")
				.and("contain", "Discussão existente");
			cy.get('[data-testid="comment-discussions-empty"]').should("not.exist");

			// Rich card (Phase 2): the like count is rendered (0 for a fresh thread).
			cy.get('[data-testid="discussion-card"]')
				.first()
				.find('[data-testid="discussion-card-likes"]')
				.should("contain", "0");
		});
	});
});
