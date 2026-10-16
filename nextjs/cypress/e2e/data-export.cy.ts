/**
 * LGPD Art. 18 II/V — right of access and data portability.
 *
 * GET /api/users/me/export must return a JSON file (export version 2) with
 * every record tied to the authenticated user: profile, content, likes,
 * reports, communities, follows, reading data and devices. No credentials
 * (password hash, tokens, push endpoint/keys) and no other users' data.
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
			if (!verse) throw new Error("verse not seeded");
			return verse._id;
		});
}

/** Every key at any depth of a JSON value. */
function allKeys(value: unknown, into = new Set<string>()): Set<string> {
	if (Array.isArray(value)) {
		value.forEach((v) => allKeys(v, into));
	} else if (value !== null && typeof value === "object") {
		for (const [k, v] of Object.entries(value)) {
			into.add(k);
			allKeys(v, into);
		}
	}
	return into;
}

const FORBIDDEN_KEYS = [
	"password",
	"tokenHash",
	"p256dh",
	"auth",
	"keys",
	"endpoint",
	"deletion",
	"renameFrom",
	"disabledBy",
	"verifiedBy",
	"hiddenBy",
	"sessionVersion",
];

describe("LGPD — data export endpoint", () => {
	beforeEach(() => {
		cy.resetDb();
		cy.seedDb({
			users: [users.alice, users.bob],
			books: [bookFixture.book],
			verses: bookFixture.verses,
		});
	});

	it("rejects anonymous callers with 401", () => {
		cy.request({
			method: "GET",
			url: "/api/users/me/export",
			failOnStatusCode: false,
		})
			.its("status")
			.should("eq", 401);
	});

	it("returns JSON with profile + comments + ownedDiscussions + answersAuthored + notifications", () => {
		// ── Bob opens a discussion that alice will answer (so answersAuthored is populated) ──
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
						title: "Pergunta do bob.",
						body: "Pergunta do bob.",
					},
				}),
			)
			.then((res) => {
				expect(res.status).to.eq(201);
				const bobDiscussionId = res.body._id as string;

				// ── Switch to alice: comment, own discussion, answer bob's discussion ──
				cy.clearCookies();
				cy.loginAs(users.alice.email, users.alice.password);

				getVerseId("gn", 1, 1).then((verseId) => {
					cy.request({
						method: "POST",
						url: `/api/comments/${verseId}`,
						body: {
							text: "Comentário da alice exclusivo.",
							tags: ["devocional"],
						},
					})
						.its("status")
						.should("eq", 201);

					// Anchor comment authored by bob so it doesn't count toward
					// alice's exported `comments` (the discussion ownership is alice's,
					// derived from the logged-in session, not the comment author).
					cy.task<{ id: string }>("db:seedComment", {
						username: "bob",
						abbrev: "gn",
						chapter: 1,
						verseNumber: 1,
						text: "Comentário âncora para a discussão da alice.",
						tags: [],
					})
						.then((r) => r.id)
						.then((anchorCommentId) =>
							cy.request({
								method: "POST",
								url: "/api/discussion/gn",
								body: {
									commentId: anchorCommentId,
									title: "Pergunta da alice.",
									body: "Pergunta da alice.",
								},
							}),
						)
						.its("status")
						.should("eq", 201);

					cy.request({
						method: "PATCH",
						url: `/api/discussion/gn/${bobDiscussionId}`,
						body: { text: "Resposta da alice na discussão do bob." },
					})
						.its("status")
						.should("eq", 200);

					// ── Export ──
					cy.request("GET", "/api/users/me/export").then((res) => {
						expect(res.status).to.eq(200);
						expect(res.headers["content-type"]).to.include("application/json");
						expect(res.headers["content-type"]).to.include("charset=utf-8");
						expect(res.headers["cache-control"]).to.include("no-store");
						expect(res.headers["content-disposition"]).to.match(
							/attachment;\s*filename=.*biblecomment-meus-dados-alice/i,
						);

						const body = res.body;
						expect(body.exportVersion).to.eq(2);
						expect(body).to.have.property("generatedAt");
						expect(body).to.have.property("profile");
						expect(body).to.have.property("comments");
						expect(body).to.have.property("ownedDiscussions");
						expect(body).to.have.property("answersAuthored");
						expect(body).to.have.property("notifications");
						expect(body.notIncluded).to.be.an("array").and.not.be.empty;

						// Profile must NOT leak the password hash.
						expect(body.profile.email).to.eq(users.alice.email);
						expect(body.profile.username).to.eq("alice");
						expect(
							body.profile,
							"exported profile must not include password",
						).to.not.have.property("password");

						// Comments: exactly one, the one alice posted — accents intact,
						// tags kept (the import reads them back).
						expect(body.comments).to.have.length(1);
						expect(body.comments[0].text).to.eq(
							"Comentário da alice exclusivo.",
						);
						expect(body.comments[0].username).to.eq("alice");
						expect(body.comments[0].tags).to.deep.eq(["devocional"]);
						expect(body.comments[0].onTitle).to.eq(false);

						// ownedDiscussions: alice's own discussion only.
						expect(body.ownedDiscussions).to.have.length(1);
						expect(body.ownedDiscussions[0].question).to.eq(
							"Pergunta da alice.",
						);

						// answersAuthored: alice's reply on bob's discussion.
						expect(body.answersAuthored).to.have.length(1);
						expect(body.answersAuthored[0].verseReference).to.eq("gn 1:2");
						expect(body.answersAuthored[0].text).to.eq(
							"Resposta da alice na discussão do bob.",
						);
					});
				});
			});
	});

	it("export of an empty account returns the structure with empty arrays", () => {
		cy.loginAs(users.alice.email, users.alice.password);

		cy.request("GET", "/api/users/me/export").then((res) => {
			expect(res.status).to.eq(200);
			const body = res.body;
			expect(body.exportVersion).to.eq(2);
			expect(body.profile.username).to.eq("alice");
			expect(body.comments).to.deep.eq([]);
			expect(body.ownedDiscussions).to.deep.eq([]);
			expect(body.answersAuthored).to.deep.eq([]);
			expect(body.notifications).to.deep.eq([]);
			expect(body.likesGiven.comments).to.deep.eq([]);
			expect(body.likesGiven.discussions).to.deep.eq([]);
			expect(body.likesGiven.answers).to.deep.eq([]);
			expect(body.commentReports).to.deep.eq([]);
			expect(body.communities.created).to.deep.eq([]);
			expect(body.communities.memberships).to.deep.eq([]);
			expect(body.communities.follows).to.deep.eq([]);
			expect(body.social.following).to.deep.eq([]);
			expect(body.social.followers).to.deep.eq([]);
			expect(body.reading.chaptersRead).to.deep.eq([]);
			expect(body.reading.activeDays).to.deep.eq([]);
			expect(body.reading.reminder).to.eq(null);
			expect(body.pushSubscriptions).to.deep.eq([]);
		});
	});

	it("exports likes, reports, communities, follows, reading data and devices — without credentials", () => {
		// On top of beforeEach's users and verses (the seeder resolves
		// usernames and slugs to ids).
		cy.seedDb({
			communities: [
				{ slug: "reformados", name: "Reformados", createdBy: users.bob.username, memberCount: 2 },
				{ slug: "da-alice", name: "Da Alice", createdBy: users.alice.username, memberCount: 1 },
			],
			communityMemberships: [
				{ username: users.bob.username, communitySlug: "reformados", status: "approved", role: "moderator" },
				{ username: users.alice.username, communitySlug: "reformados", status: "approved" },
				{ username: users.alice.username, communitySlug: "da-alice", status: "approved", role: "moderator" },
			],
			communityFollows: [
				{ username: users.alice.username, communitySlug: "reformados" },
			],
		});
		cy.task("db:seedFollow", { follower: users.alice.username, following: users.bob.username });
		cy.task("db:seedFollow", { follower: users.bob.username, following: users.alice.username });
		cy.task("db:seedChapterRead", { email: users.alice.email, abbrev: "gn", chapter: 1 });
		cy.task("db:insertResetToken", {
			email: users.alice.email,
			rawToken: "raw-reset-token",
			expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
		});

		cy.task<{ id: string }>("db:seedComment", {
			username: users.bob.username,
			abbrev: "gn",
			chapter: 1,
			verseNumber: 2,
			bookReference: "Gn 1:2",
			text: "Comentário do bob que a alice curte e denuncia.",
			tags: [],
		}).then(({ id: bobCommentId }) => {
			// Bob's discussion, which alice likes (likes are a server action,
			// so the row is seeded).
			cy.loginAs(users.bob.email, users.bob.password);
			cy.request({
				method: "POST",
				url: "/api/discussion/gn",
				body: {
					commentId: bobCommentId,
					title: "Pergunta do bob.",
					body: "Pergunta do bob.",
				},
			}).then((res) => {
				expect(res.status).to.eq(201);
				cy.task("db:seedDiscussionLike", {
					username: users.alice.username,
					targetType: "discussion",
					targetId: res.body._id as string,
				});
			});
			cy.clearCookies();

			// Alice's own actions, through the API.
			cy.loginAs(users.alice.email, users.alice.password);
			cy.request("PATCH", `/api/comments/${bobCommentId}`, { action: "like" })
				.its("status")
				.should("eq", 200);
			cy.request("PATCH", `/api/comments/${bobCommentId}`, { action: "report" })
				.its("status")
				.should("eq", 200);
			cy.request("POST", "/api/push/subscribe", {
				endpoint: "https://push.example.test/alice-device",
				keys: { p256dh: "p256dh-key", auth: "auth-key" },
			});
			cy.request("PUT", "/api/me/reading-reminder", { enabled: true, hourLocal: 7 });
			cy.request("POST", "/api/me/reading-session");

			cy.request("GET", "/api/users/me/export").then((res) => {
				expect(res.status).to.eq(200);
				const body = res.body;
				expect(body.exportVersion).to.eq(2);

				expect(body.likesGiven.comments).to.have.length(1);
				expect(body.likesGiven.comments[0].commentId).to.eq(bobCommentId);
				expect(body.likesGiven.comments[0].bookReference).to.eq("Gn 1:2");
				expect(body.likesGiven.discussions).to.have.length(1);
				expect(body.likesGiven.discussions[0].title).to.eq("Pergunta do bob.");

				expect(body.commentReports).to.have.length(1);
				expect(body.commentReports[0].commentId).to.eq(bobCommentId);

				const memberships = body.communities.memberships as Array<{
					slug: string;
					status: string;
					role: string;
				}>;
				expect(memberships.find((m) => m.slug === "reformados")).to.include({
					status: "approved",
				});
				expect(memberships.find((m) => m.slug === "da-alice")).to.include({
					role: "moderator",
				});
				expect(
					(body.communities.created as Array<{ slug: string }>).map((c) => c.slug),
				).to.deep.eq(["da-alice"]);
				expect(
					(body.communities.follows as Array<{ slug: string }>).map((c) => c.slug),
				).to.deep.eq(["reformados"]);

				expect(body.social.following).to.have.length(1);
				expect(body.social.following[0].username).to.eq("bob");
				expect(body.social.followers).to.have.length(1);
				expect(body.social.followers[0].username).to.eq("bob");

				expect(body.reading.chaptersRead[0]).to.include({ book: "gn", chapter: 1 });
				expect(body.reading.activeDays).to.have.length(1);
				expect(body.reading.reminder).to.include({ enabled: true, hourLocal: 7 });

				expect(body.pushSubscriptions).to.have.length(1);
				expect(body.pushSubscriptions[0].service).to.eq("https://push.example.test");

				// Leak canary: no credential field anywhere, at any depth, and
				// none of the seeded secrets in the file.
				const keys = allKeys(body);
				for (const k of FORBIDDEN_KEYS) {
					expect(keys.has(k), `export must not contain a "${k}" key`).to.eq(false);
				}
				const raw = JSON.stringify(body);
				for (const secret of ["alice-device", "p256dh-key", "auth-key", "raw-reset-token"]) {
					expect(raw, `export must not contain "${secret}"`).to.not.include(secret);
				}
			});
		});
	});

	it("returns 429 after 5 exports in the window", () => {
		// Fresh user per run (resetDb gives new ids), so a retry gets its own
		// rate-limit bucket.
		cy.loginAs(users.alice.email, users.alice.password);
		for (let i = 0; i < 5; i++) {
			cy.request("GET", "/api/users/me/export").its("status").should("eq", 200);
		}
		cy.request({
			method: "GET",
			url: "/api/users/me/export",
			failOnStatusCode: false,
		}).then((res) => {
			expect(res.status).to.eq(429);
			expect(Number(res.headers["retry-after"])).to.be.greaterThan(0);
			expect(res.body.error).to.match(/exportações/i);
		});
	});
});
