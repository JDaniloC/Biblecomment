/**
 * Discussion lifecycle: create / answer / notify / update-answer / delete.
 *
 * The create contract was restructured (CR — anchored discussions): a
 * discussion is always tied to a comment. The client sends only
 * { commentId, title, body }; the server reads the comment and stores its
 * text as the authoritative `commentText` snapshot and derives
 * `verseReference` from `comment.bookReference`. `question` holds the body.
 *
 * Pairs with the backend in api/discussion/[abbrev]/route.ts (list+create),
 * api/discussion/[abbrev]/[id]/route.ts (get+answer+delete) and
 * api/discussion/[abbrev]/[id]/answers/[answerId]/route.ts (update+delete).
 */

import users from "../fixtures/users.json";
import bookFixture from "../fixtures/book-gn.json";

const COMMENT_TEXT = "No princípio Deus criou os céus e a terra.";

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

describe("Discussions — create, answer, notify, delete", () => {
	beforeEach(() => {
		cy.resetDb();
		cy.seedDb({
			users: [users.alice, users.bob, users.mod],
			books: [bookFixture.book],
			verses: bookFixture.verses,
		});
	});

	describe("Create", () => {
		it("authenticated user creates a discussion anchored to a comment", () => {
			cy.loginAs(users.alice.email, users.alice.password);
			seedAnchorComment().then((commentId) => {
				cy.request({
					method: "POST",
					url: "/api/discussion/gn",
					body: {
						commentId,
						title: "Sobre a criação",
						body: "O que significa 'no princípio'?",
					},
				}).then((res) => {
					expect(res.status).to.eq(201);
					expect(res.body).to.have.property("_id");
					expect(res.body).to.have.property("username", "alice");
					expect(res.body).to.have.property("bookAbbrev", "gn");
					expect(res.body).to.have.property("title", "Sobre a criação");
					expect(res.body).to.have.property(
						"question",
						"O que significa 'no princípio'?",
					);
					expect(res.body).to.have.property("commentId", commentId);
					// Authoritative snapshot — server copied it from the comment.
					expect(res.body).to.have.property("commentText", COMMENT_TEXT);
				});
			});
		});

		it("uses the comment as the authoritative snapshot and ignores client-supplied commentText/verseReference", () => {
			cy.loginAs(users.alice.email, users.alice.password);
			seedAnchorComment().then((commentId) => {
				cy.request({
					method: "POST",
					url: "/api/discussion/gn",
					body: {
						commentId,
						title: "Snapshot autoritativo",
						body: "Corpo da discussão.",
						// Bogus fields the server must ignore.
						commentText: "TEXTO FALSO QUE DEVE SER IGNORADO",
						verseReference: "xx 99:99",
					},
				}).then((res) => {
					expect(res.status).to.eq(201);
					// commentText comes from the seeded comment, never from the body.
					expect(res.body.commentText).to.eq(COMMENT_TEXT);
					expect(res.body.commentText).to.not.eq(
						"TEXTO FALSO QUE DEVE SER IGNORADO",
					);
					// verseReference is derived from comment.bookReference (gn 1:1).
					expect(res.body.verseReference).to.eq("gn 1:1");
					expect(res.body.verseReference).to.not.eq("xx 99:99");
				});
			});
		});

		it("rejects a non-existent commentId (Comment not found)", () => {
			cy.loginAs(users.alice.email, users.alice.password);
			cy.request({
				method: "POST",
				url: "/api/discussion/gn",
				failOnStatusCode: false,
				body: {
					commentId: "000000000000000000000000",
					title: "Sem comentário",
					body: "Corpo qualquer.",
				},
			}).then((res) => {
				expect(res.status).to.be.gte(400);
			});
		});

		it("rejects anonymous POST with 401", () => {
			seedAnchorComment().then((commentId) => {
				cy.request({
					method: "POST",
					url: "/api/discussion/gn",
					failOnStatusCode: false,
					body: { commentId, title: "Título", body: "Pergunta?" },
				}).then((res) => {
					expect(res.status).to.eq(401);
				});
			});
		});

		it("rejects a missing commentId with 400", () => {
			cy.loginAs(users.alice.email, users.alice.password);
			cy.request({
				method: "POST",
				url: "/api/discussion/gn",
				failOnStatusCode: false,
				body: { title: "Título", body: "Pergunta?" },
			}).then((res) => {
				expect(res.status).to.eq(400);
			});
		});

		it("rejects an empty title with 400", () => {
			cy.loginAs(users.alice.email, users.alice.password);
			seedAnchorComment().then((commentId) => {
				cy.request({
					method: "POST",
					url: "/api/discussion/gn",
					failOnStatusCode: false,
					body: { commentId, title: "", body: "Pergunta?" },
				}).then((res) => {
					expect(res.status).to.eq(400);
				});
			});
		});

		it("rejects an empty body with 400", () => {
			cy.loginAs(users.alice.email, users.alice.password);
			seedAnchorComment().then((commentId) => {
				cy.request({
					method: "POST",
					url: "/api/discussion/gn",
					failOnStatusCode: false,
					body: { commentId, title: "Título", body: "" },
				}).then((res) => {
					expect(res.status).to.eq(400);
				});
			});
		});
	});

	describe("Answer + notification", () => {
		it("when bob answers alice's discussion, alice gets exactly one notification", () => {
			cy.loginAs(users.alice.email, users.alice.password);
			seedAnchorComment()
				.then((commentId) =>
					cy.request({
						method: "POST",
						url: "/api/discussion/gn",
						body: { commentId, title: "Discussão de alice", body: "Pergunta?" },
					}),
				)
				.then((createRes) => {
					const discussionId = createRes.body._id as string;

					// bob answers
					cy.clearCookies();
					cy.loginAs(users.bob.email, users.bob.password);
					cy.request({
						method: "PATCH",
						url: `/api/discussion/gn/${discussionId}`,
						body: { text: "Resposta do bob — sem mention" },
					}).then((patchRes) => {
						expect(patchRes.status).to.eq(200);
						expect(patchRes.body.answers).to.have.length(1);
						expect(patchRes.body.answers[0]).to.deep.include({
							name: "bob",
							text: "Resposta do bob — sem mention",
						});
					});

					// alice now has one unread discussion_answer notification.
					cy.clearCookies();
					cy.loginAs(users.alice.email, users.alice.password);
					cy.request("/api/notifications").then((res) => {
						expect(res.status).to.eq(200);
						expect(res.body.unread, "alice should have 1 unread").to.eq(1);
						const note = res.body.items.find(
							(n: { type: string }) => n.type === "discussion_answer",
						);
						expect(note, "discussion_answer notification missing").to.exist;
						expect(note.actor).to.eq("bob");
						expect(note.recipient).to.eq("alice");
						expect(note.url).to.eq(`/discussion/gn/${discussionId}`);
					});
				});
		});

		it("answering your own discussion creates NO notification (self-skip)", () => {
			cy.loginAs(users.alice.email, users.alice.password);
			seedAnchorComment()
				.then((commentId) =>
					cy.request({
						method: "POST",
						url: "/api/discussion/gn",
						body: {
							commentId,
							title: "alice talks to herself",
							body: "Pergunta?",
						},
					}),
				)
				.then((createRes) => {
					const discussionId = createRes.body._id as string;
					cy.request({
						method: "PATCH",
						url: `/api/discussion/gn/${discussionId}`,
						body: { text: "alice answering alice" },
					});
					cy.request("/api/notifications").then((res) => {
						expect(res.body.unread, "self-answer must not notify").to.eq(0);
					});
				});
		});
	});

	describe("Update answer", () => {
		it("answer owner can edit their own answer text", () => {
			cy.loginAs(users.alice.email, users.alice.password);
			seedAnchorComment()
				.then((commentId) =>
					cy.request({
						method: "POST",
						url: "/api/discussion/gn",
						body: { commentId, title: "Título", body: "Pergunta?" },
					}),
				)
				.then((createRes) => {
					const discussionId = createRes.body._id as string;
					cy.clearCookies();
					cy.loginAs(users.bob.email, users.bob.password);
					cy.request({
						method: "PATCH",
						url: `/api/discussion/gn/${discussionId}`,
						body: { text: "first version" },
					}).then((patchRes) => {
						const answerId = (
							patchRes.body.answers as Array<{ _id: string }>
						)[0]._id;
						cy.request({
							method: "PATCH",
							url: `/api/discussion/gn/${discussionId}/answers/${answerId}`,
							body: { text: "edited version" },
						}).then((editRes) => {
							expect(editRes.status).to.eq(200);
							const updated = (
								editRes.body.answers as Array<{ _id: string; text: string }>
							).find((a) => a._id === answerId);
							expect(updated?.text).to.eq("edited version");
						});
					});
				});
		});

		it("non-owner gets 403 when editing someone else's answer", () => {
			cy.loginAs(users.alice.email, users.alice.password);
			seedAnchorComment()
				.then((commentId) =>
					cy.request({
						method: "POST",
						url: "/api/discussion/gn",
						body: { commentId, title: "Título", body: "Pergunta?" },
					}),
				)
				.then((createRes) => {
					const discussionId = createRes.body._id as string;
					cy.clearCookies();
					cy.loginAs(users.bob.email, users.bob.password);
					cy.request({
						method: "PATCH",
						url: `/api/discussion/gn/${discussionId}`,
						body: { text: "bob's answer" },
					}).then((patchRes) => {
						const answerId = (
							patchRes.body.answers as Array<{ _id: string }>
						)[0]._id;
						// alice tries to edit bob's answer — must fail.
						cy.clearCookies();
						cy.loginAs(users.alice.email, users.alice.password);
						cy.request({
							method: "PATCH",
							url: `/api/discussion/gn/${discussionId}/answers/${answerId}`,
							body: { text: "hijack attempt" },
							failOnStatusCode: false,
						}).then((res) => {
							expect(res.status).to.eq(403);
						});
					});
				});
		});

		it("moderator can edit any answer", () => {
			cy.loginAs(users.alice.email, users.alice.password);
			seedAnchorComment()
				.then((commentId) =>
					cy.request({
						method: "POST",
						url: "/api/discussion/gn",
						body: { commentId, title: "Título", body: "Pergunta?" },
					}),
				)
				.then((createRes) => {
					const discussionId = createRes.body._id as string;
					cy.clearCookies();
					cy.loginAs(users.bob.email, users.bob.password);
					cy.request({
						method: "PATCH",
						url: `/api/discussion/gn/${discussionId}`,
						body: { text: "bob's answer" },
					}).then((patchRes) => {
						const answerId = (
							patchRes.body.answers as Array<{ _id: string }>
						)[0]._id;
						cy.clearCookies();
						cy.loginAs(users.mod.email, users.mod.password);
						cy.request({
							method: "PATCH",
							url: `/api/discussion/gn/${discussionId}/answers/${answerId}`,
							body: { text: "moderated content" },
						}).then((res) => {
							expect(res.status).to.eq(200);
						});
					});
				});
		});

		it("404 when answerId doesn't exist", () => {
			cy.loginAs(users.alice.email, users.alice.password);
			seedAnchorComment()
				.then((commentId) =>
					cy.request({
						method: "POST",
						url: "/api/discussion/gn",
						body: { commentId, title: "Título", body: "Pergunta?" },
					}),
				)
				.then((createRes) => {
					const discussionId = createRes.body._id as string;
					cy.request({
						method: "PATCH",
						url: `/api/discussion/gn/${discussionId}/answers/507f1f77bcf86cd799439011`,
						body: { text: "x" },
						failOnStatusCode: false,
					}).then((res) => {
						expect(res.status).to.eq(404);
					});
				});
		});

		it("400 with empty answer text", () => {
			cy.loginAs(users.alice.email, users.alice.password);
			seedAnchorComment()
				.then((commentId) =>
					cy.request({
						method: "POST",
						url: "/api/discussion/gn",
						body: { commentId, title: "Título", body: "Pergunta?" },
					}),
				)
				.then((createRes) => {
					const discussionId = createRes.body._id as string;
					cy.request({
						method: "PATCH",
						url: `/api/discussion/gn/${discussionId}`,
						body: { text: "first" },
					}).then((patchRes) => {
						const answerId = (
							patchRes.body.answers as Array<{ _id: string }>
						)[0]._id;
						cy.request({
							method: "PATCH",
							url: `/api/discussion/gn/${discussionId}/answers/${answerId}`,
							body: { text: "" },
							failOnStatusCode: false,
						}).then((res) => {
							expect(res.status).to.eq(400);
						});
					});
				});
		});
	});

	describe("Delete", () => {
		it("owner can delete their own discussion", () => {
			cy.loginAs(users.alice.email, users.alice.password);
			seedAnchorComment()
				.then((commentId) =>
					cy.request({
						method: "POST",
						url: "/api/discussion/gn",
						body: { commentId, title: "to delete", body: "Pergunta?" },
					}),
				)
				.then((createRes) => {
					const id = createRes.body._id as string;
					cy.request({
						method: "DELETE",
						url: `/api/discussion/gn/${id}`,
					}).then((res) => {
						expect(res.status).to.eq(200);
					});
				});
		});

		it("moderator can delete anyone's discussion", () => {
			cy.loginAs(users.alice.email, users.alice.password);
			seedAnchorComment()
				.then((commentId) =>
					cy.request({
						method: "POST",
						url: "/api/discussion/gn",
						body: {
							commentId,
							title: "alice's, mod deletes",
							body: "Pergunta?",
						},
					}),
				)
				.then((createRes) => {
					const id = createRes.body._id as string;
					cy.clearCookies();
					cy.loginAs(users.mod.email, users.mod.password);
					cy.request({
						method: "DELETE",
						url: `/api/discussion/gn/${id}`,
					}).then((res) => {
						expect(res.status).to.eq(200);
					});
				});
		});

		it("non-owner non-moderator gets 403", () => {
			cy.loginAs(users.alice.email, users.alice.password);
			seedAnchorComment()
				.then((commentId) =>
					cy.request({
						method: "POST",
						url: "/api/discussion/gn",
						body: { commentId, title: "alice's", body: "Pergunta?" },
					}),
				)
				.then((createRes) => {
					const id = createRes.body._id as string;
					cy.clearCookies();
					cy.loginAs(users.bob.email, users.bob.password);
					cy.request({
						method: "DELETE",
						url: `/api/discussion/gn/${id}`,
						failOnStatusCode: false,
					}).then((res) => {
						expect(res.status).to.eq(403);
					});
				});
		});
	});
});
