/**
 * Chapter-reader comment sidebar — two just-shipped features:
 *
 *   1. The "Contribuir" action shows the number of discussions anchored to
 *      that comment (Comment.discussionCount, enriched server-side via
 *      DiscussionModel.countByCommentId): "· 0" with none, "· 1" after one.
 *   2. Per-comment management actions live behind a kebab
 *      ([data-testid="comment-menu-<id>"], aria-label "Mais ações"). The menu
 *      conditionally MOUNTS its items (Editar / Excluir / Reportar / mod-verify)
 *      only once opened; the inline Útil + Contribuir buttons stay in the
 *      footer row (NOT inside the menu). The menu body is an absolutely-
 *      positioned popover, so we assert items exist / are removed on
 *      open / close rather than viewport visibility (the popover can render
 *      below the fold of a tall sidebar and may overlap the footer row).
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
			cy.get('[data-testid="comment-discuss"]').first().should("contain", "0");

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
			cy.get('[data-testid="comment-discuss"]').first().should("contain", "1");
		});
	});

	it("kebab menu holds management actions; primary actions stay inline", () => {
		cy.loginAs(users.alice.email, users.alice.password);

		seedAnchorComment().then((commentId) => {
			openVerseOneSidebar();

			// The kebab trigger renders for the logged-in owner.
			cy.get(`[data-testid="comment-menu-${commentId}"]`).should("exist");

			// Útil + Contribuir stay inline in the footer (visible before open).
			cy.get('[data-testid="comment-discuss"]').first().should("be.visible");

			// Management items are NOT mounted until the menu opens.
			cy.get(`[data-testid="delete-${commentId}"]`).should("not.exist");

			// Open the menu; aria-expanded flips, confirming the React handler
			// fired before we probe the (conditionally mounted) items.
			cy.get(`[data-testid="comment-menu-${commentId}"]`)
				.click()
				.should("have.attr", "aria-expanded", "true");

			// Delete (owner) + Editar now exist in the open menu's popover.
			// Assert both within a single retry-able [role="menu"] query so the
			// check is atomic: an async re-render (e.g. useSession resolving and
			// re-rendering the card) can briefly unmount/remount the popover
			// between two separate cy.get() commands, which made a delete-then-menu
			// two-step flake even though the menu is open (aria-expanded=true).
			cy.get('[role="menu"]')
				.should("contain", "Editar")
				.and((menu) => {
					expect(
						menu.find(`[data-testid="delete-${commentId}"]`),
					).to.have.length(1);
				});

			// Útil + Contribuir are inline, NOT inside the popover: the discuss
			// button still exists outside any [role="menu"]. (The open popover is
			// an absolutely-positioned z-20 layer that may visually overlap the
			// footer row — that occlusion is expected, so it is not asserted.)
			cy.get('[data-testid="comment-discuss"]').should("exist");
			cy.get('[role="menu"]')
				.find('[data-testid="comment-discuss"]')
				.should("not.exist");

			// Closing: the open menu renders a fixed-inset backdrop button
			// (aria-hidden, tabindex=-1) whose onClick calls setOpenMenuId(null).
			// It covers the kebab trigger, so close via the backdrop with
			// { force: true } (it is intentionally aria-hidden / zero-content).
			cy.get(`[data-testid="comment-menu-${commentId}"]`)
				.parent()
				.find('button[aria-hidden="true"][tabindex="-1"]')
				.click({ force: true });
			cy.get(`[data-testid="comment-menu-${commentId}"]`).should(
				"have.attr",
				"aria-expanded",
				"false",
			);
			// Items unmount once the menu closes.
			cy.get(`[data-testid="delete-${commentId}"]`).should("not.exist");
		});
	});
});
