/**
 * Comment lifecycle: CRUD + like + report + ownership + moderator override.
 *
 * The unit tests in CommentUseCases.test.ts already cover the auth/owner
 * branches with mocked repos. This spec exercises the full HTTP+Mongo
 * stack: cookies, Mongoose persistence, parseBody validation.
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
			).find((item) => item.verseNumber === verseNumber);
			if (!verse) {
				throw new Error(
					`verse ${abbrev} ${chapter}:${verseNumber} should be seeded`,
				);
			}
			return verse._id;
		});
}

describe("Comments — full lifecycle", () => {
	beforeEach(() => {
		cy.resetDb();
		cy.seedDb({
			// Seed the chapter tutorial as completed so its full-screen coach-mark
			// overlay (pointer-events:none on the page) doesn't block the reader
			// panel in the inline-delete UI tests. Harmless for the API tests.
			users: [users.alice, users.bob, users.mod].map((u) => ({
				...u,
				tutorialsCompleted: ["chapter-v1"],
			})),
			books: [bookFixture.book],
			verses: bookFixture.verses,
		});
	});

	describe("Create", () => {
		it("authenticated user posts and the comment appears in the verse listing", () => {
			cy.loginAs(users.alice.email, users.alice.password);

			getVerseId("gn", 1, 1).then((verseId) => {
				cy.request({
					method: "POST",
					url: `/api/comments/${verseId}`,
					body: {
						text: "Comentário de teste — alice em Gn 1:1",
						tags: ["devocional"],
					},
				}).then((res) => {
					expect(res.status).to.eq(201);
					expect(res.body).to.have.property("username", "alice");
					expect(res.body).to.have.property(
						"text",
						"Comentário de teste — alice em Gn 1:1",
					);
				});
			});

			cy.request("/api/comments/chapter/gn/1/1").then((res) => {
				const all = [
					...(res.body.titleComments ?? []),
					...(res.body.verseComments ?? []),
				];
				const mine = all.find(
					(c: { username: string }) => c.username === "alice",
				);
				expect(mine, "alice's comment should appear in the verse listing").to
					.exist;
			});
		});

		it("rejects anonymous POST with 401", () => {
			getVerseId("gn", 1, 1).then((verseId) => {
				cy.request({
					method: "POST",
					url: `/api/comments/${verseId}`,
					body: { text: "should not land", tags: [] },
					failOnStatusCode: false,
				}).then((res) => {
					expect(res.status).to.eq(401);
				});
			});
		});

		it("rejects empty text with 400 (Zod validation)", () => {
			cy.loginAs(users.alice.email, users.alice.password);
			getVerseId("gn", 1, 1).then((verseId) => {
				cy.request({
					method: "POST",
					url: `/api/comments/${verseId}`,
					body: { text: "", tags: [] },
					failOnStatusCode: false,
				}).then((res) => {
					expect(res.status).to.eq(400);
					expect(res.body).to.have.property("error", "Validation failed");
				});
			});
		});
	});

	describe("Update (PATCH)", () => {
		it("owner can edit their own comment text", () => {
			cy.loginAs(users.alice.email, users.alice.password);
			getVerseId("gn", 1, 1).then((verseId) => {
				cy.request({
					method: "POST",
					url: `/api/comments/${verseId}`,
					body: { text: "first draft", tags: [] },
				}).then((createRes) => {
					const id = createRes.body._id as string;
					cy.request({
						method: "PATCH",
						url: `/api/comments/${id}`,
						body: { text: "edited by alice", tags: ["pessoal"] },
					}).then((patchRes) => {
						expect(patchRes.status).to.eq(200);
						expect(patchRes.body).to.have.property("text", "edited by alice");
						expect(patchRes.body.tags).to.include("pessoal");
					});
				});
			});
		});

		it("non-owner gets 403 when editing someone else's comment", () => {
			cy.loginAs(users.alice.email, users.alice.password);
			let commentId: string;
			getVerseId("gn", 1, 1).then((verseId) => {
				cy.request({
					method: "POST",
					url: `/api/comments/${verseId}`,
					body: { text: "alice's comment", tags: [] },
				}).then((createRes) => {
					commentId = createRes.body._id as string;

					// Switch to bob and try to edit alice's comment.
					cy.clearCookies();
					cy.loginAs(users.bob.email, users.bob.password);
					cy.request({
						method: "PATCH",
						url: `/api/comments/${commentId}`,
						body: { text: "bob hijacking", tags: [] },
						failOnStatusCode: false,
					}).then((res) => {
						expect(res.status).to.eq(403);
					});
				});
			});
		});
	});

	describe("Like / Report (PATCH with action)", () => {
		it("toggle like flips the count + likedByMe via the CommentLike collection", () => {
			cy.loginAs(users.alice.email, users.alice.password);
			getVerseId("gn", 1, 1).then((verseId) => {
				cy.request({
					method: "POST",
					url: `/api/comments/${verseId}`,
					body: { text: "likeable", tags: [] },
				}).then((createRes) => {
					const id = createRes.body._id as string;

					cy.clearCookies();
					cy.loginAs(users.bob.email, users.bob.password);

					cy.request({
						method: "PATCH",
						url: `/api/comments/${id}`,
						body: { action: "like" },
					}).then((res) => {
						expect(res.body.commentId).to.eq(id);
						expect(res.body.likeCount).to.eq(1);
						expect(res.body.likedByMe).to.eq(true);
					});
					cy.task<number>("db:countLikesForComment", id).should("eq", 1);
					cy.task<number>("db:countCommentLikesByUser", users.bob.email).should(
						"eq",
						1,
					);

					// Toggle off.
					cy.request({
						method: "PATCH",
						url: `/api/comments/${id}`,
						body: { action: "like" },
					}).then((res) => {
						expect(res.body.likeCount).to.eq(0);
						expect(res.body.likedByMe).to.eq(false);
					});
					cy.task<number>("db:countLikesForComment", id).should("eq", 0);
				});
			});
		});

		it("report inserts a CommentReport row and is idempotent on the unique index", () => {
			cy.loginAs(users.alice.email, users.alice.password);
			getVerseId("gn", 1, 1).then((verseId) => {
				cy.request({
					method: "POST",
					url: `/api/comments/${verseId}`,
					body: { text: "reportable", tags: [] },
				}).then((createRes) => {
					const id = createRes.body._id as string;

					cy.clearCookies();
					cy.loginAs(users.bob.email, users.bob.password);

					cy.request({
						method: "PATCH",
						url: `/api/comments/${id}`,
						body: { action: "report" },
					}).then((res) => {
						expect(res.body.commentId).to.eq(id);
						expect(res.body.reportCount).to.eq(1);
						expect(res.body.reportedByMe).to.eq(true);
					});
					cy.task<number>("db:countReportsForComment", id).should("eq", 1);

					// Reporting again is a no-op (unique {userId, commentId} index).
					cy.request({
						method: "PATCH",
						url: `/api/comments/${id}`,
						body: { action: "report" },
					}).then((res) => {
						expect(res.body.reportCount, "report must be idempotent").to.eq(1);
					});
					cy.task<number>("db:countReportsForComment", id).should("eq", 1);
				});
			});
		});
	});

	describe("Delete", () => {
		it("owner can delete their own comment", () => {
			cy.loginAs(users.alice.email, users.alice.password);
			getVerseId("gn", 1, 1).then((verseId) => {
				cy.request({
					method: "POST",
					url: `/api/comments/${verseId}`,
					body: { text: "to delete", tags: [] },
				}).then((createRes) => {
					const id = createRes.body._id as string;
					cy.request({ method: "DELETE", url: `/api/comments/${id}` }).then(
						(res) => {
							expect(res.status).to.eq(200);
							expect(res.body).to.have.property("success", true);
						},
					);
				});
			});
		});

		it("moderator can delete anyone's comment", () => {
			cy.loginAs(users.alice.email, users.alice.password);
			let commentId: string;
			getVerseId("gn", 1, 1).then((verseId) => {
				cy.request({
					method: "POST",
					url: `/api/comments/${verseId}`,
					body: { text: "alice's, mod will delete", tags: [] },
				}).then((createRes) => {
					commentId = createRes.body._id as string;

					cy.clearCookies();
					cy.loginAs(users.mod.email, users.mod.password);
					cy.request({
						method: "DELETE",
						url: `/api/comments/${commentId}`,
					}).then((res) => {
						expect(res.status).to.eq(200);
					});
				});
			});
		});

		it("non-owner non-moderator gets 403", () => {
			cy.loginAs(users.alice.email, users.alice.password);
			let commentId: string;
			getVerseId("gn", 1, 1).then((verseId) => {
				cy.request({
					method: "POST",
					url: `/api/comments/${verseId}`,
					body: { text: "alice's", tags: [] },
				}).then((createRes) => {
					commentId = createRes.body._id as string;

					cy.clearCookies();
					cy.loginAs(users.bob.email, users.bob.password);
					cy.request({
						method: "DELETE",
						url: `/api/comments/${commentId}`,
						failOnStatusCode: false,
					}).then((res) => {
						expect(res.status).to.eq(403);
					});
				});
			});
		});
	});

	describe("Inline delete (reader panel)", () => {
		it("author can delete their own comment from the reader panel", () => {
			cy.loginAs(users.alice.email, users.alice.password);
			getVerseId("gn", 1, 1).then((verseId) => {
				cy.request("POST", `/api/comments/${verseId}`, {
					text: "alice inline-delete target",
					tags: ["devocional"],
				}).then((res) => {
					const id = res.body._id as string;

					cy.visit("/verses/gn/1");
					cy.get("li#1 button").first().click();
					cy.contains("alice inline-delete target").should("be.visible");

					cy.get(`[data-testid="delete-${id}"]`).click();
					cy.get('[role="alertdialog"]').should("be.visible");
					cy.get('[role="alertdialog"] button[data-variant="danger"]').click();

					cy.contains("alice inline-delete target").should("not.exist");
				});
			});
		});

		it("non-author does not see the delete button on someone else's comment", () => {
			cy.loginAs(users.alice.email, users.alice.password);
			getVerseId("gn", 1, 1).then((verseId) => {
				cy.request("POST", `/api/comments/${verseId}`, {
					text: "alice owns this one",
					tags: ["devocional"],
				}).then((res) => {
					const id = res.body._id as string;

					cy.clearCookies();
					cy.loginAs(users.bob.email, users.bob.password);
					cy.visit("/verses/gn/1");
					cy.get("li#1 button").first().click();
					cy.contains("alice owns this one").should("be.visible");

					cy.get(`[data-testid="delete-${id}"]`).should("not.exist");
				});
			});
		});
	});

	// Regression: in a standalone PWA the Android back gesture maps to
	// history.back(). The panel used to be pure React state with no
	// history entry, so back navigated away from the chapter (and EXITED
	// the app when it was the first history entry) instead of just
	// closing the comment panel.
	describe("Back gesture closes the comment panel (PWA)", () => {
		it("browser/Android back closes the panel and stays on the chapter", () => {
			cy.loginAs(users.alice.email, users.alice.password);
			cy.visit("/verses/gn/1");
			cy.get("li#1 button").first().click();
			cy.get('[aria-label="Fechar comentários"]').should("be.visible");

			cy.go("back");

			cy.location("pathname").should("eq", "/verses/gn/1");
			cy.get('[aria-label="Fechar comentários"]').should("not.exist");
		});

		it("closing with the X button still works and stays on the chapter", () => {
			cy.loginAs(users.alice.email, users.alice.password);
			cy.visit("/verses/gn/1");
			cy.get("li#1 button").first().click();
			cy.get('[aria-label="Fechar comentários"]').should("be.visible");

			cy.get('[aria-label="Fechar comentários"]').click();

			cy.location("pathname").should("eq", "/verses/gn/1");
			cy.get('[aria-label="Fechar comentários"]').should("not.exist");
		});
	});
});
