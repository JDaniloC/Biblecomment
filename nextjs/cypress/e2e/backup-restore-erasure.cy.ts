/**
 * Admin backup restore (moderators only) must never undo an account
 * deletion (LGPD Art. 18 VI).
 *
 * Deleting an account records a tombstone (only its id and the date). A
 * users restore skips any row whose `_id` has one, so an old backup can't
 * bring the account back; content whose author has no live account is
 * stored anonymized. Tombstones are exported and restored too
 * (/api/backup/erasures), first in a disaster recovery.
 */

import users from "../fixtures/users.json";
import bookFixture from "../fixtures/book-gn.json";
import type { FoundUser } from "../tasks/db";

const ANON = "[usuário removido]";

type UsersReport = {
	received: number;
	created: number;
	skipped: Record<string, number>;
};
type BackupUserRow = { _id: string; email: string; username: string };
type BackupCommentRow = { _id: string; username: string; verseId: string; text: string };
type Erasure = { userId: string; erasedAt: string };

function deleteSelf(email: string, password: string) {
	cy.clearCookies();
	cy.loginAs(email, password);
	cy.request({ method: "DELETE", url: "/api/users", body: { email } })
		.its("status")
		.should("eq", 200);
	cy.clearCookies();
}

function asModerator() {
	cy.clearCookies();
	cy.loginAs(users.mod.email, users.mod.password);
}

describe("LGPD — backup restore never brings back a deleted account", () => {
	beforeEach(() => {
		cy.resetDb();
		cy.seedDb({
			users: [users.alice, users.bob, users.mod],
			books: [bookFixture.book],
			verses: bookFixture.verses,
		});
	});

	it("backup endpoints are moderator-only downloads", () => {
		cy.loginAs(users.alice.email, users.alice.password);
		for (const kind of ["users", "comments", "discussions", "erasures"]) {
			cy.request({ url: `/api/backup/${kind}`, failOnStatusCode: false })
				.its("status")
				.should("eq", 403);
		}
		cy.request({
			method: "POST",
			url: "/api/backup/erasures",
			body: [],
			failOnStatusCode: false,
		})
			.its("status")
			.should("eq", 403);

		asModerator();
		for (const kind of ["users", "comments", "discussions", "erasures"]) {
			cy.request(`/api/backup/${kind}`).then((res) => {
				expect(res.status).to.eq(200);
				expect(res.headers["cache-control"]).to.include("no-store");
				expect(res.headers["content-disposition"]).to.match(
					new RegExp(`attachment;\\s*filename="biblecomment-backup-${kind}-`),
				);
				expect(res.body, `${kind} export is a bare array`).to.be.an("array");
			});
		}
	});

	it("a users restore skips the deleted account; content of unknown authors is anonymized", () => {
		cy.task<{ id: string }>("db:seedComment", {
			username: users.alice.username,
			abbrev: "gn",
			chapter: 1,
			verseNumber: 1,
			text: "Comentário da alice antes da exclusão.",
		});
		cy.task<string>("db:getUserId", users.alice.email).then((aliceId) => {
			// 1. The moderator takes the backups while alice still exists.
			asModerator();
			cy.request("/api/backup/users").then((usersRes) => {
				const usersBackup = usersRes.body as BackupUserRow[];
				expect(usersBackup).to.have.length(3);
				expect(
					usersBackup.find((u) => u.email === users.alice.email)?._id,
					"the users backup carries the account id",
				).to.eq(aliceId);

				cy.request("/api/backup/comments").then((commentsRes) => {
					const commentsBackup = commentsRes.body as BackupCommentRow[];
					expect(commentsBackup.map((c) => c.username)).to.include("alice");

					// 2. Alice deletes her account: only a tombstone remains.
					deleteSelf(users.alice.email, users.alice.password);
					cy.task("db:countErasures", { userId: aliceId }).should("eq", 1);

					// 3. Restoring the pre-deletion users backup doesn't bring her back.
					asModerator();
					cy.request("POST", "/api/backup/users", usersBackup).then((res) => {
						expect(res.status).to.eq(201);
						const report = res.body as UsersReport;
						expect(report.received).to.eq(3);
						expect(report.created).to.eq(0);
						expect(report.skipped.erased).to.eq(1);
						expect(report.skipped.exists).to.eq(2);
					});
					cy.task<FoundUser>("db:findUser", users.alice.email)
						.its("exists")
						.should("eq", false);

					// 4. Content whose author has no live account (deleted, or
					// never existed) is stored anonymized, never under the name.
					const verseId = commentsBackup[0].verseId;
					cy.request("POST", "/api/backup/comments", {
						comments: [
							{
								verseId,
								username: "alice",
								onTitle: false,
								bookReference: "Gn 1:1",
								text: "Linha forjada em nome da alice.",
								tags: [],
							},
							{
								verseId,
								username: "ghost",
								onTitle: false,
								bookReference: "Gn 1:1",
								text: "Linha de um autor desconhecido.",
								tags: [],
							},
						],
					}).then((res) => {
						expect(res.status).to.eq(201);
						expect(res.body).to.include({ received: 2, created: 2, anonymized: 2 });
					});
					cy.request("/api/backup/comments").then((res) => {
						const rows = res.body as BackupCommentRow[];
						for (const text of [
							"Linha forjada em nome da alice.",
							"Linha de um autor desconhecido.",
						]) {
							expect(rows.find((r) => r.text === text)?.username, text).to.eq(ANON);
						}
						expect(
							rows.filter((r) => r.username === "alice" || r.username === "ghost"),
							"no row is stored under a name without a live account",
						).to.deep.eq([]);
					});

					// 5. Re-posting the comments backup creates nothing: every row
					// still exists under its original id.
					cy.request("POST", "/api/backup/comments", commentsBackup).then((res) => {
						expect(res.status).to.eq(201);
						expect(res.body.received).to.eq(commentsBackup.length);
						expect(res.body.created).to.eq(0);
					});
				});
			});
		});
	});

	it("erasures export/import round-trips idempotently and holds only id + date", () => {
		cy.task<string>("db:getUserId", users.alice.email).then((aliceId) => {
			deleteSelf(users.alice.email, users.alice.password);

			asModerator();
			cy.request("/api/backup/erasures").then((res) => {
				const erasures = res.body as Erasure[];
				expect(erasures).to.have.length(1);
				expect(erasures[0].userId).to.eq(aliceId);
				expect(Object.keys(erasures[0]).sort()).to.deep.eq(["erasedAt", "userId"]);
				expect(JSON.stringify(erasures)).to.not.include(users.alice.email);
				expect(JSON.stringify(erasures)).to.not.include(users.alice.username);

				// Posting the export back changes nothing.
				cy.request("POST", "/api/backup/erasures", erasures).then((post) => {
					expect(post.status).to.eq(201);
					expect(post.body).to.deep.eq({ received: 1, created: 0 });
				});
				cy.task("db:countErasures").should("eq", 1);
			});

			// A tombstone from another backup is added once, then is a no-op.
			const other = {
				userId: "0123456789abcdef01234567",
				erasedAt: "2026-01-01T00:00:00.000Z",
			};
			cy.request("POST", "/api/backup/erasures", { erasures: [other] })
				.its("body")
				.should("deep.eq", { received: 1, created: 1 });
			cy.request("POST", "/api/backup/erasures", { erasures: [other] })
				.its("body")
				.should("deep.eq", { received: 1, created: 0 });
			cy.task("db:countErasures").should("eq", 2);
		});
	});

	it("disaster recovery: erasures first, then users — the deleted account stays deleted, a lost one returns under its id", () => {
		cy.task<string>("db:getUserId", users.bob.email).then((bobId) => {
			// Bob's session from before the loss.
			cy.loginAs(users.bob.email, users.bob.password);
			cy.sessionCookies().then((bobSession) => {
				asModerator();
				cy.request("/api/backup/users").then((usersRes) => {
					const usersBackup = usersRes.body as BackupUserRow[];
					deleteSelf(users.alice.email, users.alice.password);

					asModerator();
					cy.request("/api/backup/erasures").then((erasuresRes) => {
						const erasuresBackup = erasuresRes.body as Erasure[];
						expect(erasuresBackup).to.have.length(1);

						// Total loss: every collection is gone, tombstones included.
						// Only a moderator account is re-created by hand.
						cy.resetDb();
						cy.seedDb({ users: [users.mod] });
						asModerator();

						cy.request("POST", "/api/backup/erasures", erasuresBackup)
							.its("body")
							.should("deep.eq", { received: 1, created: 1 });

						cy.request("POST", "/api/backup/users", usersBackup).then((res) => {
							expect(res.status).to.eq(201);
							const report = res.body as UsersReport;
							expect(report.received).to.eq(3);
							expect(report.created).to.eq(1);
							expect(report.skipped.erased).to.eq(1);
							expect(report.skipped.exists).to.eq(1);
						});

						cy.task<FoundUser>("db:findUser", users.alice.email)
							.its("exists")
							.should("eq", false);
						cy.task<string>("db:getUserId", users.bob.email).should("eq", bobId);
						cy.task<FoundUser>("db:findUser", users.bob.email).then((bob) => {
							expect(bob.exists).to.eq(true);
							expect(bob.username).to.eq("bob");
							expect(bob.sessionVersion, "a restored account starts at a random version").to.be.greaterThan(0);
						});

						// A token minted before the loss doesn't revive with the
						// account. The export re-reads the account (bypassing this
						// process's session cache, which bob's sign-in warmed seconds
						// ago and nothing in a raw data loss clears), and that read
						// refreshes the cache, so the plain session read then
						// rejects the token too.
						cy.useSessionCookies(bobSession);
						cy.request({ url: "/api/users/me/export", failOnStatusCode: false })
							.its("status")
							.should("eq", 401);
						cy.useSessionCookies(bobSession);
						cy.request("/api/auth/session").then((s) =>
							expect(s.body, "bob's pre-loss session").to.equal(null),
						);
					});
				});
			});
		});
	});
});
