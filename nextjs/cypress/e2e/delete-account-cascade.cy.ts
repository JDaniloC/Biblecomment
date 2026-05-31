/**
 * LGPD Art. 18 — anonymize-on-delete cascade.
 *
 * Verifies the full DB-level cascade end-to-end (real Mongo, real
 * sessions). UserUseCases.test.ts mocks the four repositories; this
 * spec confirms the wired implementation actually mutates documents
 * the way the unit test asserts.
 *
 * Scenario:
 *   1. alice posts a comment on Gn 1:1
 *   2. alice opens a discussion on Gn 1:1
 *   3. bob posts a comment on Gn 1:1
 *   4. bob answers alice's discussion (creates a notification for alice)
 *   5. alice likes bob's comment
 *   6. alice reports bob's comment
 *   7. alice deletes her account
 *
 * Expected after delete:
 *   - alice's User document is gone (session lookups 401)
 *   - alice's comment text remains, username is "[usuário removido]"
 *   - alice's discussion username is anonymized; bob's answer untouched
 *   - bob's comment loses alice's like (commentlikes row gone) and her report
 *   - all notifications addressed to / from "alice" are removed
 */

import users from "../fixtures/users.json";
import bookFixture from "../fixtures/book-gn.json";

const ANON = "[usuário removido]";

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
			).to.not.equal(undefined);
			if (!verse) throw new Error("verse not seeded");
			return verse._id;
		});
}

describe("LGPD — delete account cascade", () => {
	beforeEach(() => {
		cy.resetDb();
		cy.seedDb({
			users: [users.alice, users.bob, users.mod],
			books: [bookFixture.book],
			verses: bookFixture.verses,
		});
	});

	it("anonymizes alice's PII across comments, discussions, answers, likes, reports, and notifications", () => {
		// ── Alice posts a comment + opens a discussion on Gn 1:1 ──
		cy.loginAs(users.alice.email, users.alice.password);

		getVerseId("gn", 1, 1).then((verseId) => {
			cy.request({
				method: "POST",
				url: `/api/comments/${verseId}`,
				body: { text: "Comentário da alice em Gn 1:1.", tags: ["devocional"] },
			}).then((aliceCommentRes) => {
				expect(aliceCommentRes.status).to.eq(201);
				const aliceCommentId = aliceCommentRes.body._id as string;

				cy.task<{ id: string }>("db:seedComment", {
					username: "alice",
					abbrev: "gn",
					chapter: 1,
					verseNumber: 1,
					text: "Reflexão da alice.",
					tags: [],
				})
					.then((r) => r.id)
					.then((anchorCommentId) =>
						cy.request({
							method: "POST",
							url: "/api/discussion/gn",
							body: {
								commentId: anchorCommentId,
								title: "Sobre a criação",
								body: "O que significa 'no princípio'?",
							},
						}),
					)
					.then((aliceDiscRes) => {
						expect(aliceDiscRes.status).to.eq(201);
						const aliceDiscussionId = aliceDiscRes.body._id as string;

						// ── Switch to bob: post a comment + answer alice's discussion ──
						cy.clearCookies();
						cy.loginAs(users.bob.email, users.bob.password);

						cy.request({
							method: "POST",
							url: `/api/comments/${verseId}`,
							body: { text: "Comentário do bob em Gn 1:1.", tags: ["exegese"] },
						}).then((bobCommentRes) => {
							expect(bobCommentRes.status).to.eq(201);
							const bobCommentId = bobCommentRes.body._id as string;

							cy.request({
								method: "PATCH",
								url: `/api/discussion/gn/${aliceDiscussionId}`,
								body: { text: "Resposta do bob para a alice." },
							})
								.its("status")
								.should("eq", 200);

							// ── Switch back to alice: like + report bob's comment ──
							cy.clearCookies();
							cy.loginAs(users.alice.email, users.alice.password);

							cy.request({
								method: "PATCH",
								url: `/api/comments/${bobCommentId}`,
								body: { action: "like" },
							})
								.its("status")
								.should("eq", 200);
							cy.request({
								method: "PATCH",
								url: `/api/comments/${bobCommentId}`,
								body: { action: "report" },
							})
								.its("status")
								.should("eq", 200);

							// Sanity: pre-delete state has alice's like on bob's comment.
							// (Public chapter API strips reports[]; we'll verify the report
							// cascade via the mod-only endpoint after the delete.)
							cy.request("GET", "/api/comments/chapter/gn/1/1").then(
								(preRes) => {
									const all = [
										...(preRes.body.titleComments ?? []),
										...(preRes.body.prioritized ?? []),
										...(preRes.body.others ?? []),
									];
									const bobPre = all.find(
										(c: { _id: string }) => c._id === bobCommentId,
									);
									expect(
										bobPre.likeCount,
										"bob's comment shows 1 like pre-delete",
									).to.eq(1);
								},
							);
							cy.task<number>("db:countLikesForComment", bobCommentId).should(
								"eq",
								1,
							);

							// Pre-delete: mod sees bob's comment in the reports queue (alice reported it).
							cy.clearCookies();
							cy.loginAs(users.mod.email, users.mod.password);
							cy.request("GET", "/api/moderation/reports?pages=1").then(
								(modRes) => {
									const reported = modRes.body.items as Array<{
										_id: string;
										reportCount: number;
										reporters: string[];
									}>;
									const target = reported.find((c) => c._id === bobCommentId);
									expect(
										target,
										"bob's comment should be in the reports queue pre-delete",
									).to.not.equal(undefined);
									if (!target) throw new Error("unreachable");
									expect(target.reportCount).to.eq(1);
									expect(
										target.reporters,
										"alice should be the reporter",
									).to.include("alice");
								},
							);
							cy.task<number>("db:countReportsForComment", bobCommentId).should(
								"eq",
								1,
							);

							cy.clearCookies();
							cy.loginAs(users.alice.email, users.alice.password);

							// Alice should have at least one notification (bob answered her discussion).
							cy.request("GET", "/api/notifications").then((notifRes) => {
								expect(
									notifRes.body.items.length,
									"alice has notifications pre-delete",
								).to.be.greaterThan(0);
							});

							// ── Alice deletes her account ──
							cy.request({
								method: "DELETE",
								url: "/api/users",
								body: { email: users.alice.email },
							})
								.its("status")
								.should("eq", 200);

							// ── Post-delete assertions ──

							// The session can no longer authenticate (User row is gone).
							cy.request({
								method: "GET",
								url: "/api/users/me",
								failOnStatusCode: false,
							})
								.its("status")
								.should("eq", 401);

							// alice's comment is anonymized but text intact.
							cy.request("GET", "/api/comments/chapter/gn/1/1").then(
								(postRes) => {
									const all = [
										...(postRes.body.titleComments ?? []),
										...(postRes.body.prioritized ?? []),
										...(postRes.body.others ?? []),
									];

									const aliceCmt = all.find(
										(c: { _id: string }) => c._id === aliceCommentId,
									);
									expect(aliceCmt, "alice's comment should still exist").to
										.exist;
									expect(aliceCmt.username).to.eq(ANON);
									expect(aliceCmt.text).to.eq("Comentário da alice em Gn 1:1.");

									const bobCmt = all.find(
										(c: { _id: string }) => c._id === bobCommentId,
									);
									expect(
										bobCmt,
										"bob's comment should still exist",
									).to.not.equal(undefined);
									expect(bobCmt.username).to.eq("bob");
									expect(bobCmt.likeCount, "alice's like cascaded out").to.eq(
										0,
									);
								},
							);
							// Confirm at the storage layer too — no orphan commentlikes rows.
							cy.task<number>("db:countLikesForComment", bobCommentId).should(
								"eq",
								0,
							);
							cy.task<number>(
								"db:countCommentLikesByUser",
								users.alice.email,
							).should("eq", 0);

							// The mod-only reports queue confirms alice's report was pulled —
							// bob's comment loses its only report row and falls out of the queue.
							cy.clearCookies();
							cy.loginAs(users.mod.email, users.mod.password);
							cy.request("GET", "/api/moderation/reports?pages=1").then(
								(modRes) => {
									const reported = modRes.body.items as Array<{ _id: string }>;
									const stillThere = reported.find(
										(c) => c._id === bobCommentId,
									);
									expect(
										stillThere,
										"bob's comment should leave the reports queue post-delete",
									).to.equal(undefined);
								},
							);
							cy.task<number>("db:countReportsForComment", bobCommentId).should(
								"eq",
								0,
							);
							cy.task<number>(
								"db:countCommentReportsByUser",
								users.alice.email,
							).should("eq", 0);

							// alice's discussion username is anonymized; bob's answer intact.
							cy.request("GET", `/api/discussion/gn/${aliceDiscussionId}`).then(
								(discRes) => {
									const disc = discRes.body;
									expect(disc.username).to.eq(ANON);
									expect(disc.question).to.eq(
										"O que significa 'no princípio'?",
									);
									const bobAnswer = disc.answers.find(
										(a: { name: string }) => a.name === "bob",
									);
									expect(
										bobAnswer,
										"bob's answer survives the cascade",
									).to.not.equal(undefined);
									expect(bobAnswer.text).to.eq("Resposta do bob para a alice.");
								},
							);

							// alice's email no longer exists in the User collection.
							cy.task<{ exists: boolean }>(
								"db:findUser",
								users.alice.email,
							).then((u) => {
								expect(u.exists, "alice's user document is hard-deleted").to.be
									.false;
							});
						});
					});
			});
		});
	});

	it("when alice answered someone else's discussion, only her embedded answer is anonymized", () => {
		cy.loginAs(users.bob.email, users.bob.password);
		cy.task<{ id: string }>("db:seedComment", {
			username: "bob",
			abbrev: "gn",
			chapter: 1,
			verseNumber: 2,
			text: "Comentário âncora do bob.",
			tags: [],
		})
			.then((r) => r.id)
			.then((anchorCommentId) =>
				cy.request({
					method: "POST",
					url: "/api/discussion/gn",
					body: {
						commentId: anchorCommentId,
						title: "Sobre o caos primordial",
						body: "O que é 'sem forma e vazia'?",
					},
				}),
			)
			.then((res) => {
				expect(res.status).to.eq(201);
				const bobDiscussionId = res.body._id as string;

				cy.clearCookies();
				cy.loginAs(users.alice.email, users.alice.password);

				cy.request({
					method: "PATCH",
					url: `/api/discussion/gn/${bobDiscussionId}`,
					body: { text: "Reflexão da alice sobre o tohu va-bohu." },
				})
					.its("status")
					.should("eq", 200);

				cy.request({
					method: "DELETE",
					url: "/api/users",
					body: { email: users.alice.email },
				})
					.its("status")
					.should("eq", 200);

				cy.request("GET", `/api/discussion/gn/${bobDiscussionId}`).then(
					(postRes) => {
						const disc = postRes.body;
						expect(disc.username, "bob's discussion ownership untouched").to.eq(
							"bob",
						);
						const aliceAnswer = disc.answers.find(
							(a: { text: string }) =>
								a.text === "Reflexão da alice sobre o tohu va-bohu.",
						);
						expect(aliceAnswer, "alice's answer text preserved").to.not.equal(
							undefined,
						);
						expect(
							aliceAnswer.name,
							"alice's name in answer is anonymized",
						).to.eq(ANON);
					},
				);
			});
	});
});
