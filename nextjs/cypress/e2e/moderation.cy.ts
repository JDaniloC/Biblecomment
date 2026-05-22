/**
 * Moderator-only endpoints — RBAC + actions.
 *
 * Routes covered:
 *  - GET    /api/moderation/reports
 *  - DELETE /api/moderation/reports/[id]   (clears the reports array)
 *  - PATCH  /api/users/moderator           (set moderator flag on another user)
 */

import users from "../fixtures/users.json";
import bookFixture from "../fixtures/book-gn.json";

function getVerseId(
	abbrev: string,
	chapter: number,
	verseNumber: number,
): Cypress.Chainable<string> {
	return cy
		.request("GET", `/api/books/${abbrev}/verses/${chapter}`)
		.then((res) => {
			const verse = (
				res.body as Array<{ _id: string; verseNumber: number }>
			).find((v) => v.verseNumber === verseNumber);
			expect(
				verse,
				`verse ${abbrev} ${chapter}:${verseNumber} should be seeded`,
			).to.exist;
			return verse!._id;
		});
}

describe("Moderation endpoints", () => {
	beforeEach(() => {
		cy.resetDb();
		cy.seedDb({
			users: [users.alice, users.bob, users.mod],
			books: [bookFixture.book],
			verses: bookFixture.verses,
		});
	});

	describe("GET /api/moderation/reports", () => {
		it("anonymous → 401", () => {
			cy.request({
				method: "GET",
				url: "/api/moderation/reports",
				failOnStatusCode: false,
			}).then((res) => {
				// Route checks user?.moderator — unauthenticated users have no
				// session, so the optional-chain returns undefined → forbidden().
				expect(res.status).to.eq(403);
			});
		});

		it("regular user → 403", () => {
			cy.loginAs(users.alice.email, users.alice.password);
			cy.request({
				method: "GET",
				url: "/api/moderation/reports",
				failOnStatusCode: false,
			}).then((res) => {
				expect(res.status).to.eq(403);
			});
		});

		it("moderator → 200 with paginated items containing only reported comments", () => {
			// Setup: alice posts a comment, bob reports it.
			cy.loginAs(users.alice.email, users.alice.password);
			let reportedId: string;
			getVerseId("gn", 1, 1).then((verseId) => {
				cy.request({
					method: "POST",
					url: `/api/comments/${verseId}`,
					body: { text: "controversial comment", tags: [] },
				}).then((createRes) => {
					reportedId = createRes.body._id as string;

					cy.clearCookies();
					cy.loginAs(users.bob.email, users.bob.password);
					cy.request({
						method: "PATCH",
						url: `/api/comments/${reportedId}`,
						body: { action: "report" },
					});

					// Now mod views reports.
					cy.clearCookies();
					cy.loginAs(users.mod.email, users.mod.password);
					cy.request("/api/moderation/reports").then((res) => {
						expect(res.status).to.eq(200);
						expect(res.body).to.have.property("page", 1);
						expect(res.body).to.have.property("pageSize", 20);
						const found = (
							res.body.items as Array<{
								_id: string;
								reportCount: number;
								reporters: string[];
							}>
						).find((c) => c._id === reportedId);
						expect(found, "reported comment must appear in moderation list").to
							.exist;
						expect(found!.reportCount).to.eq(1);
						expect(found!.reporters).to.include("bob");
					});
				});
			});
		});
	});

	describe("DELETE /api/moderation/reports/[id]", () => {
		it("regular user → 403", () => {
			cy.loginAs(users.alice.email, users.alice.password);
			cy.request({
				method: "DELETE",
				url: "/api/moderation/reports/507f1f77bcf86cd799439011",
				failOnStatusCode: false,
			}).then((res) => {
				expect(res.status).to.eq(403);
			});
		});

		it("moderator clears the reports array but keeps the comment", () => {
			// Alice posts, bob reports, mod clears.
			cy.loginAs(users.alice.email, users.alice.password);
			let reportedId: string;
			getVerseId("gn", 1, 1).then((verseId) => {
				cy.request({
					method: "POST",
					url: `/api/comments/${verseId}`,
					body: { text: "to be unreported", tags: [] },
				}).then((createRes) => {
					reportedId = createRes.body._id as string;

					cy.clearCookies();
					cy.loginAs(users.bob.email, users.bob.password);
					cy.request({
						method: "PATCH",
						url: `/api/comments/${reportedId}`,
						body: { action: "report" },
					});

					cy.clearCookies();
					cy.loginAs(users.mod.email, users.mod.password);
					cy.request({
						method: "DELETE",
						url: `/api/moderation/reports/${reportedId}`,
					}).then((res) => {
						expect(res.status).to.eq(200);
						expect(
							res.body.cleared,
							"exactly bob's report row was wiped",
						).to.eq(1);
					});
					cy.task<number>("db:countReportsForComment", reportedId).should(
						"eq",
						0,
					);

					// The comment itself is still there (only reports were cleared).
					cy.request("/api/comments/chapter/gn/1/1").then((listRes) => {
						const all = [
							...(listRes.body.titleComments ?? []),
							...(listRes.body.prioritized ?? []),
							...(listRes.body.others ?? []),
						];
						const stillThere = all.find(
							(c: { _id: string }) => c._id === reportedId,
						);
						expect(
							stillThere,
							"comment must NOT be deleted, only reports cleared",
						).to.exist;
					});
				});
			});
		});

		it("clearing on a missing target is a no-op (200, cleared: 0)", () => {
			// Phase 9.2: clear is now a deleteMany on the CommentReport collection.
			// It doesn't need the parent Comment to exist — idempotent semantics.
			cy.loginAs(users.mod.email, users.mod.password);
			cy.request({
				method: "DELETE",
				url: "/api/moderation/reports/507f1f77bcf86cd799439011",
			}).then((res) => {
				expect(res.status).to.eq(200);
				expect(res.body.cleared).to.eq(0);
			});
		});
	});

	describe("PATCH /api/users/moderator", () => {
		it("regular user → 403", () => {
			cy.loginAs(users.alice.email, users.alice.password);
			cy.request({
				method: "PATCH",
				url: "/api/users/moderator",
				body: { email: users.bob.email, moderator: true },
				failOnStatusCode: false,
			}).then((res) => {
				expect(res.status).to.eq(403);
			});
		});

		it("moderator can promote another user; demotion also works", () => {
			cy.loginAs(users.mod.email, users.mod.password);

			// Promote bob.
			cy.request({
				method: "PATCH",
				url: "/api/users/moderator",
				body: { email: users.bob.email, moderator: true },
			}).then((res) => {
				expect(res.status).to.eq(200);
				expect(res.body).to.deep.include({
					email: users.bob.email,
					username: "bob",
					moderator: true,
				});
			});

			// Bob's next login should grant moderator access.
			cy.clearCookies();
			cy.loginAs(users.bob.email, users.bob.password);
			cy.request("/api/moderation/reports").then((res) => {
				expect(
					res.status,
					"bob, now a moderator, should access /api/moderation/reports",
				).to.eq(200);
			});

			// Mod demotes bob back.
			cy.clearCookies();
			cy.loginAs(users.mod.email, users.mod.password);
			cy.request({
				method: "PATCH",
				url: "/api/users/moderator",
				body: { email: users.bob.email, moderator: false },
			}).then((res) => {
				expect(res.status).to.eq(200);
				expect(res.body.moderator).to.eq(false);
			});
		});

		it("404 when target user doesn't exist", () => {
			cy.loginAs(users.mod.email, users.mod.password);
			cy.request({
				method: "PATCH",
				url: "/api/users/moderator",
				body: { email: "ghost@cypress.test", moderator: true },
				failOnStatusCode: false,
			}).then((res) => {
				expect(res.status).to.eq(404);
			});
		});

		it("400 with malformed body", () => {
			cy.loginAs(users.mod.email, users.mod.password);
			cy.request({
				method: "PATCH",
				url: "/api/users/moderator",
				body: { email: "not-an-email", moderator: true },
				failOnStatusCode: false,
			}).then((res) => {
				expect(res.status).to.eq(400);
			});
		});
	});

	// ── Soft-hide a comment + disable a user ──────────────────────────

	/** Post a comment as the currently-logged-in user; resolves to its id. */
	function postComment(
		verseId: string,
		text: string,
	): Cypress.Chainable<string> {
		return cy
			.request("POST", `/api/comments/${verseId}`, { text, tags: [] })
			.then((res) => res.body._id as string);
	}

	/** Ids of every comment visible in the public chapter read of Gn 1:1. */
	function chapterCommentIds(): Cypress.Chainable<string[]> {
		return cy.request("/api/comments/chapter/gn/1/1").then((res) => {
			const all = [
				...(res.body.titleComments ?? []),
				...(res.body.prioritized ?? []),
				...(res.body.others ?? []),
			];
			return all.map((c: { _id: string }) => c._id);
		});
	}

	/**
	 * Drive the credentials login flow without asserting success — cy.loginAs
	 * asserts a session cookie, so it can't express an *expected* failure.
	 */
	function attemptLogin(email: string, password: string) {
		cy.request("/api/auth/csrf").then((csrf) => {
			cy.request({
				method: "POST",
				url: "/api/auth/callback/credentials",
				form: true,
				body: {
					email,
					password,
					csrfToken: csrf.body.csrfToken,
					callbackUrl: "/home",
					json: "true",
				},
				followRedirect: false,
				failOnStatusCode: false,
			});
		});
	}

	describe("PATCH /api/comments/[id] — hide / unhide", () => {
		it("a non-moderator cannot hide a comment → 403", () => {
			cy.loginAs(users.alice.email, users.alice.password);
			getVerseId("gn", 1, 1).then((verseId) => {
				postComment(verseId, "alice's comment").then((id) => {
					cy.clearCookies();
					cy.loginAs(users.bob.email, users.bob.password);
					cy.request({
						method: "PATCH",
						url: `/api/comments/${id}`,
						body: { action: "hide" },
						failOnStatusCode: false,
					}).then((res) => expect(res.status).to.eq(403));
				});
			});
		});

		it("a moderator hides a comment: gone from the public read, kept in the moderation list", () => {
			cy.loginAs(users.alice.email, users.alice.password);
			getVerseId("gn", 1, 1).then((verseId) => {
				postComment(verseId, "comment to hide").then((id) => {
					cy.clearCookies();
					cy.loginAs(users.mod.email, users.mod.password);
					cy.request({
						method: "PATCH",
						url: `/api/comments/${id}`,
						body: { action: "hide" },
					}).then((res) => {
						expect(res.status).to.eq(200);
						expect(res.body.hiddenAt).to.not.be.null;
						expect(res.body.hiddenReason).to.eq("moderator");
					});

					chapterCommentIds().should("not.include", id);

					cy.request("/api/moderation/comments").then((res) => {
						const ids = (res.body.items as Array<{ _id: string }>).map(
							(c) => c._id,
						);
						expect(ids, "moderator still sees the hidden comment").to.include(
							id,
						);
					});
				});
			});
		});

		it("the author still sees their own hidden comment via /api/users/comments", () => {
			cy.loginAs(users.alice.email, users.alice.password);
			getVerseId("gn", 1, 1).then((verseId) => {
				postComment(verseId, "alice hidden comment").then((id) => {
					cy.clearCookies();
					cy.loginAs(users.mod.email, users.mod.password);
					cy.request("PATCH", `/api/comments/${id}`, { action: "hide" });

					cy.clearCookies();
					cy.loginAs(users.alice.email, users.alice.password);
					cy.request("/api/users/comments").then((res) => {
						const mine = (
							res.body.comments as Array<{ _id: string; hiddenAt?: string }>
						).find((c) => c._id === id);
						expect(mine, "author sees own hidden comment").to.exist;
						expect(mine!.hiddenAt).to.not.be.undefined;
					});
				});
			});
		});

		it("a moderator can un-hide a comment, restoring it to the public read", () => {
			cy.loginAs(users.alice.email, users.alice.password);
			getVerseId("gn", 1, 1).then((verseId) => {
				postComment(verseId, "hide then show").then((id) => {
					cy.clearCookies();
					cy.loginAs(users.mod.email, users.mod.password);
					cy.request("PATCH", `/api/comments/${id}`, { action: "hide" });
					chapterCommentIds().should("not.include", id);

					cy.request("PATCH", `/api/comments/${id}`, { action: "unhide" });
					chapterCommentIds().should("include", id);
				});
			});
		});
	});

	describe("PATCH /api/moderation/users — disable / enable", () => {
		it("a non-moderator cannot disable an account → 403", () => {
			cy.loginAs(users.alice.email, users.alice.password);
			cy.request({
				method: "PATCH",
				url: "/api/moderation/users",
				body: { email: users.bob.email, disabled: true },
				failOnStatusCode: false,
			}).then((res) => expect(res.status).to.eq(403));
		});

		it("disabling a user hides all their comments and blocks their login", () => {
			cy.loginAs(users.alice.email, users.alice.password);
			getVerseId("gn", 1, 1).then((verseId) => {
				postComment(verseId, "alice comment one").then((id1) => {
					postComment(verseId, "alice comment two").then((id2) => {
						cy.clearCookies();
						cy.loginAs(users.mod.email, users.mod.password);
						cy.request({
							method: "PATCH",
							url: "/api/moderation/users",
							body: { email: users.alice.email, disabled: true },
						}).then((res) => {
							expect(res.status).to.eq(200);
							expect(res.body.disabled).to.be.true;
						});

						cy.task<number>(
							"db:countHiddenCommentsByUsername",
							"alice",
						).should("eq", 2);
						chapterCommentIds().then((ids) => {
							expect(ids).to.not.include(id1);
							expect(ids).to.not.include(id2);
						});

						// Alice can no longer start a session.
						cy.clearCookies();
						attemptLogin(users.alice.email, users.alice.password);
						cy.getCookies().then((cookies) => {
							const session = cookies.find((c) =>
								/authjs\.session-token|next-auth\.session-token/.test(
									c.name,
								),
							);
							expect(session, "disabled user must not get a session").to.be
								.undefined;
						});
					});
				});
			});
		});

		it("re-enabling restores cascade-hidden comments but keeps moderator-hidden ones hidden", () => {
			cy.loginAs(users.alice.email, users.alice.password);
			getVerseId("gn", 1, 1).then((verseId) => {
				postComment(verseId, "individually hidden").then((modHidden) => {
					postComment(verseId, "cascade hidden").then((cascade) => {
						cy.clearCookies();
						cy.loginAs(users.mod.email, users.mod.password);

						// Hide one comment individually, then disable the account.
						cy.request("PATCH", `/api/comments/${modHidden}`, {
							action: "hide",
						});
						cy.request("PATCH", "/api/moderation/users", {
							email: users.alice.email,
							disabled: true,
						});

						// Re-enable the account.
						cy.request("PATCH", "/api/moderation/users", {
							email: users.alice.email,
							disabled: false,
						});

						chapterCommentIds().then((ids) => {
							expect(
								ids,
								"cascade-hidden comment is restored",
							).to.include(cascade);
							expect(
								ids,
								"individually-hidden comment stays hidden",
							).to.not.include(modHidden);
						});
					});
				});
			});
		});
	});
});
