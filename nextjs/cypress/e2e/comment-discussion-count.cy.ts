/**
 * Chapter-reader comment sidebar — two just-shipped features:
 *
 *   1. The "Contribuir" action shows the number of discussions anchored to
 *      that comment (Comment.discussionCount, enriched server-side via
 *      DiscussionModel.countByCommentId): "· 0" with none, "· 1" after one.
 *   2. Per-comment management actions live behind a kebab
 *      ([data-testid="comment-menu-<id>"], aria-label "Mais ações"). The menu
 *      mounts its items (Editar / Excluir / Reportar / mod-verify) only once
 *      opened; the inline Útil + Contribuir buttons stay visible regardless.
 *
 * Mirrors comments.cy.ts for seeding (tutorialsCompleted so the chapter tour
 * overlay doesn't intercept clicks) and for opening a verse's comment panel,
 * and discussion-restructure.cy.ts for seeding an anchor comment + creating a
 * discussion via the real POST /api/discussion/gn endpoint.
 */

import users from "../fixtures/users.json";
import bookFixture from "../fixtures/book-gn.json";

const COMMENT_TEXT = "No princípio Deus criou os céus e a terra.";

describe("Comment sidebar — discussion count + kebab management menu", () => {
	beforeEach(() => {
		cy.resetDb();
		cy.seedDb({
			// Mark the chapter tutorial complete so its full-screen coach-mark
			// overlay (pointer-events:none) never intercepts clicks on the reader.
			users: [users.alice].map((u) => ({
				...u,
				tutorialsCompleted: ["chapter-v1"],
			})),
			books: [bookFixture.book],
			verses: bookFixture.verses,
		});
	});

	/** Seed an anchor comment on gn 1:1 (as alice) and resolve to its id. */
	function seedAnchorComment() {
		return cy
			.task<string>("db:seedComment", {
				username: "alice",
				abbrev: "gn",
				chapter: 1,
				verseNumber: 1,
				text: COMMENT_TEXT,
				tags: [],
			})
			.then((id) => id as string);
	}

	/** Open the verse-1 comment panel the way comments.cy.ts does. */
	function openVerseOneSidebar() {
		cy.visit("/verses/gn/1");
		cy.get("li#1 button").first().click();
		cy.contains(COMMENT_TEXT).should("be.visible");
	}

	it("shows discussion count on the Contribuir button", () => {
		cy.loginAs(users.alice.email, users.alice.password);

		seedAnchorComment().then((commentId) => {
			// Before any discussion exists the count is 0.
			openVerseOneSidebar();
			cy.get('[data-testid="comment-discuss"]')
				.first()
				.should("contain", "0");

			// Create a discussion anchored to that comment via the real API.
			cy.request({
				method: "POST",
				url: "/api/discussion/gn",
				body: { commentId, title: "T", body: "B" },
			}).then((res) => {
				expect(res.status).to.eq(201);
			});

			// After a discussion is created the count reflects 1.
			cy.reload();
			cy.get("li#1 button").first().click();
			cy.contains(COMMENT_TEXT).should("be.visible");
			cy.get('[data-testid="comment-discuss"]')
				.first()
				.should("contain", "1");
		});
	});

	it("kebab menu holds management actions; primary actions stay inline", () => {
		cy.loginAs(users.alice.email, users.alice.password);

		seedAnchorComment().then((commentId) => {
			openVerseOneSidebar();

			// The kebab trigger renders for the logged-in owner.
			cy.get(`[data-testid="comment-menu-${commentId}"]`).should("exist");

			// Útil + Contribuir stay inline (outside the menu) and visible.
			cy.get('[data-testid="comment-discuss"]').first().should("be.visible");

			// Management items mount only after the menu opens.
			cy.get(`[data-testid="delete-${commentId}"]`).should("not.exist");

			cy.get(`[data-testid="comment-menu-${commentId}"]`).click();

			cy.get(`[data-testid="delete-${commentId}"]`).should("be.visible");
			// Editar is an owner action inside the same menu.
			cy.contains("Editar").should("be.visible");

			// Inline primary actions are unaffected by the open menu.
			cy.get('[data-testid="comment-discuss"]').first().should("be.visible");

			// Clicking outside closes the menu and unmounts its items.
			cy.get("body").click(0, 0);
			cy.get(`[data-testid="delete-${commentId}"]`).should("not.exist");
		});
	});
});
