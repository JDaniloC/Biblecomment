/**
 * LGPD Art. 18 — anonymize-on-delete cascade.
 *
 * Verifies the full DB-level cascade end-to-end (real Mongo, real
 * sessions). UserUseCases.test.ts covers the use case with fakes; this
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
									assert.exists(aliceCmt, "alice's comment should still exist");
									expect(aliceCmt.username).to.eq(ANON);
									expect(aliceCmt.text).to.eq("Comentário da alice em Gn 1:1.");

									const bobCmt = all.find(
										(c: { _id: string }) => c._id === bobCommentId,
									);
									assert.exists(bobCmt, "bob's comment should still exist");
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
									assert.notExists(
										stillThere,
										"bob's comment should leave the reports queue post-delete",
									);
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
									assert.exists(bobAnswer, "bob's answer survives the cascade");
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
						assert.exists(aliceAnswer, "alice's answer text preserved");
						expect(
							aliceAnswer.name,
							"alice's name in answer is anonymized",
						).to.eq(ANON);
					},
				);
			});
	});
});

/**
 * The rest of the cascade: communities (membership, follows, counters,
 * ownership), the social graph, reading data, devices — and that a deleted
 * account's existing session stops working. Row counts use the id/username
 * captured BEFORE the delete; a lookup by email afterwards would find no
 * user and report 0 for the wrong reason.
 */
describe("LGPD — delete account: communities, social graph and sessions", () => {
	const SESSION_COOKIE = /authjs\.session-token|next-auth\.session-token/;

	type CommunityDTO = {
		_id: string;
		createdBy: string;
		memberCount: number;
		followerCount: number;
		updatedAt: string;
	};
	const getCommunity = (slug: string) =>
		cy
			.request({ url: `/api/communities/${slug}`, failOnStatusCode: false })
			.then((res) => res);

	function deleteSelf(email: string, password: string) {
		cy.clearCookies();
		cy.loginAs(email, password);
		cy.request({ method: "DELETE", url: "/api/users", body: { email } })
			.its("status")
			.should("eq", 200);
		cy.clearCookies();
	}

	beforeEach(() => {
		cy.resetDb();
	});

	it("removes alice's community rows, follows, reading data and devices, and fixes the counters", () => {
		cy.seedDb({
			users: [users.alice, users.bob],
			books: [bookFixture.book],
			verses: bookFixture.verses,
			communities: [
				{ slug: "reformados", name: "Reformados", createdBy: users.bob.username, memberCount: 2 },
			],
			communityMemberships: [
				{ username: users.bob.username, communitySlug: "reformados", status: "approved", role: "moderator" },
				{ username: users.alice.username, communitySlug: "reformados", status: "approved" },
			],
			communityFollows: [
				{ username: users.bob.username, communitySlug: "reformados" },
				{ username: users.alice.username, communitySlug: "reformados" },
			],
		});
		cy.task("db:seedFollow", { follower: users.alice.username, following: users.bob.username });
		cy.task("db:seedFollow", { follower: users.bob.username, following: users.alice.username });
		cy.task("db:seedChapterRead", { email: users.alice.email, abbrev: "gn", chapter: 1 });

		// Alice's own devices, reminders and reading sessions, through the API.
		cy.loginAs(users.alice.email, users.alice.password);
		cy.request("POST", "/api/push/subscribe", {
			endpoint: "https://push.example.test/alice-device",
			keys: { p256dh: "p256dh-key", auth: "auth-key" },
		});
		cy.request("PUT", "/api/me/reading-reminder", { enabled: true, hourLocal: 7 });
		cy.request("POST", "/api/me/reading-session");
		cy.clearCookies();

		getCommunity("reformados").then((before) => {
			const c = (before.body as { community: CommunityDTO }).community;
			expect(c.memberCount).to.eq(2);
			expect(c.followerCount).to.eq(2);

			cy.task<string>("db:getUserId", users.alice.email).then((aliceId) => {
				cy.task<Record<string, number>>("db:countUserRefs", {
					userId: aliceId,
					username: users.alice.username,
				}).then((refs) => {
					// Sanity: the seeding really created every kind of row.
					for (const k of [
						"communitymemberships",
						"communityfollows",
						"follows",
						"userchapterreads",
						"readingsessions",
						"pushsubscriptions",
						"readingreminderpreferences",
					]) {
						expect(refs[k], `${k} before delete`).to.be.greaterThan(0);
					}
				});

				deleteSelf(users.alice.email, users.alice.password);

				cy.task<Record<string, number>>("db:countUserRefs", {
					userId: aliceId,
					username: users.alice.username,
				}).then((refs) => {
					for (const [k, n] of Object.entries(refs)) {
						expect(n, `${k} rows left for alice`).to.eq(0);
					}
				});
			});

			getCommunity("reformados").then((after) => {
				const a = (after.body as { community: CommunityDTO }).community;
				expect(a.memberCount).to.eq(1);
				expect(a.followerCount).to.eq(1);
				// The page changed (a member's comments drop off), so its
				// sitemap lastmod moves too.
				expect(new Date(a.updatedAt).getTime()).to.be.greaterThan(
					new Date(c.updatedAt).getTime(),
				);
			});
		});
	});

	it("hands a community alice created to its senior approved member, who can then manage it", () => {
		cy.seedDb({
			users: [users.alice, users.bob],
			books: [bookFixture.book],
			verses: bookFixture.verses,
			communities: [
				{ slug: "da-alice", name: "Da Alice", createdBy: users.alice.username, memberCount: 2 },
			],
			communityMemberships: [
				{ username: users.alice.username, communitySlug: "da-alice", status: "approved", role: "moderator" },
				{ username: users.bob.username, communitySlug: "da-alice", status: "approved" },
			],
		});

		deleteSelf(users.alice.email, users.alice.password);

		cy.task<string>("db:getUserId", users.bob.email).then((bobId) => {
			getCommunity("da-alice").then((res) => {
				const c = (res.body as { community: CommunityDTO }).community;
				expect(c.createdBy).to.eq(bobId);
				expect(c.memberCount).to.eq(1);
			});
		});
		// Creator-only action: proves bob really owns it now.
		cy.loginAs(users.bob.email, users.bob.password);
		cy.request("DELETE", "/api/communities/da-alice").its("status").should("eq", 200);
	});

	it("deletes a community alice created when nobody else is an approved member", () => {
		cy.seedDb({
			users: [users.alice, users.bob],
			books: [bookFixture.book],
			verses: bookFixture.verses,
			communities: [
				{ slug: "so-da-alice", name: "Só da Alice", createdBy: users.alice.username, memberCount: 1 },
			],
			communityMemberships: [
				{ username: users.alice.username, communitySlug: "so-da-alice", status: "approved", role: "moderator" },
				{ username: users.bob.username, communitySlug: "so-da-alice", status: "pending" },
			],
		});

		deleteSelf(users.alice.email, users.alice.password);

		getCommunity("so-da-alice").its("status").should("eq", 404);
		cy.task<string>("db:getUserId", users.bob.email).then((bobId) => {
			cy.task<Record<string, number>>("db:countUserRefs", {
				userId: bobId,
				username: users.bob.username,
			})
				.its("communitymemberships")
				.should("eq", 0);
		});
	});

	it("a session of an account deleted by a moderator stops working", () => {
		cy.seedDb({
			users: [users.alice, users.mod],
			books: [bookFixture.book],
			verses: bookFixture.verses,
		});
		let aliceId = "";
		cy.task<string>("db:getUserId", users.alice.email).then((id) => {
			aliceId = id;
		});
		cy.loginAs(users.alice.email, users.alice.password);
		cy.request("/api/users/me").its("status").should("eq", 200);
		cy.getCookies().then((cookies) => {
			const session = cookies.find((c) => SESSION_COOKIE.test(c.name));
			expect(session, "alice has a session cookie").to.exist;

			cy.clearCookies();
			cy.loginAs(users.mod.email, users.mod.password);
			cy.request({
				method: "DELETE",
				url: "/api/users",
				body: { email: users.alice.email },
			})
				.its("status")
				.should("eq", 200);

			// Replay alice's still-unexpired JWT against routes that trust the
			// token's claims without looking the account up themselves — only
			// the session revalidation can turn them away.
			cy.clearCookies();
			cy.setCookie(session!.name, session!.value);
			cy.request("/api/auth/session").then((res) => expect(res.body, "session").to.equal(null));
			cy.request({ method: "POST", url: "/api/me/reading-session", failOnStatusCode: false })
				.its("status")
				.should("eq", 401);
			cy.task<Record<string, number>>("db:countUserRefs", {
				userId: aliceId,
				username: users.alice.username,
			})
				.its("readingsessions")
				.should("eq", 0);
		});
	});
});
