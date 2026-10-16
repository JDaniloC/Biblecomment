/**
 * Self-service comment import — POST /api/users/me/import.
 *
 * Restores the user's own comments from an export file. It creates
 * content, so it has the same gates as posting a comment (active account,
 * verified e-mail), validates each row on its own (a bad row is counted as
 * `failed`, the rest still import), and is rate-limited per user.
 */

import users from "../fixtures/users.json";
import bookFixture from "../fixtures/book-gn.json";

const carol = {
	email: "carol@cypress.test",
	username: "carol",
	password: "carol-secret-123",
	emailVerified: false,
};

type ImportResult = { imported: number; skipped: number; failed: number };

function importComments(
	comments: unknown[],
): Cypress.Chainable<Cypress.Response<ImportResult & { error?: string }>> {
	return cy.request<ImportResult & { error?: string }>({
		method: "POST",
		url: "/api/users/me/import",
		body: { comments },
		failOnStatusCode: false,
	});
}

/** Comment rows currently stored under `username`. */
function commentCount(email: string, username: string): Cypress.Chainable<number> {
	return cy.task<string>("db:getUserId", email).then((userId) =>
		cy
			.task<Record<string, number>>("db:countUserRefs", { userId, username })
			.then((refs) => refs.comments),
	);
}

describe("LGPD — self-service comment import", () => {
	beforeEach(() => {
		cy.resetDb();
		cy.seedDb({
			users: [users.alice, users.mod, carol],
			books: [bookFixture.book],
			verses: bookFixture.verses,
		});
	});

	it("rejects anonymous callers with 401", () => {
		importComments([]).its("status").should("eq", 401);
	});

	it("refuses an unverified account with 403 and writes nothing", () => {
		cy.loginAs(carol.email, carol.password);
		importComments([{ bookReference: "Gn 1:1", text: "Não deveria entrar." }]).then(
			(res) => {
				expect(res.status).to.eq(403);
				expect(JSON.stringify(res.body)).to.match(/verifique seu e-?mail/i);
			},
		);
		commentCount(carol.email, carol.username).should("eq", 0);
	});

	it("imports the rows, then skips them all on a re-import", () => {
		const rows = [
			{ bookReference: "Gn 1:1", text: "Importado 1", tags: ["devocional"] },
			{ bookReference: "Gn 1:2", text: "Importado 2" },
		];
		cy.loginAs(users.alice.email, users.alice.password);

		importComments(rows).then((res) => {
			expect(res.status).to.eq(200);
			expect(res.body).to.deep.eq({ imported: 2, skipped: 0, failed: 0 });
		});
		importComments(rows).then((res) => {
			expect(res.status).to.eq(200);
			expect(res.body).to.deep.eq({ imported: 0, skipped: 2, failed: 0 });
		});

		cy.request("GET", "/api/users/me/export").then((res) => {
			const comments = res.body.comments as Array<{
				username: string;
				text: string;
				tags: string[];
			}>;
			expect(comments).to.have.length(2);
			comments.forEach((c) => expect(c.username).to.eq("alice"));
			const first = comments.find((c) => c.text === "Importado 1");
			expect(first?.tags).to.deep.eq(["devocional"]);

			// The export file itself is a valid import source: everything in
			// it already exists, so it is all skipped.
			importComments(comments).then((again) => {
				expect(again.status).to.eq(200);
				expect(again.body).to.deep.eq({ imported: 0, skipped: 2, failed: 0 });
			});
		});
	});

	it("counts rows over the per-row limits as failed and imports the rest", () => {
		cy.loginAs(users.alice.email, users.alice.password);
		importComments([
			{ bookReference: "Gn 1:1", text: "Linha válida." },
			{ bookReference: "Gn 1:2", text: "a".repeat(5001) },
			{
				bookReference: "Gn 1:3",
				text: "Tags demais.",
				tags: Array.from({ length: 21 }, (_, i) => `tag${i}`),
			},
		]).then((res) => {
			expect(res.status).to.eq(200);
			expect(res.body).to.deep.eq({ imported: 1, skipped: 0, failed: 2 });
		});
	});

	it("rejects a file with more than 5000 rows with 400", () => {
		cy.loginAs(users.alice.email, users.alice.password);
		const rows = Array.from({ length: 5001 }, () => ({}));
		importComments(rows).then((res) => {
			expect(res.status).to.eq(400);
		});
		commentCount(users.alice.email, users.alice.username).should("eq", 0);
	});

	it("returns 429 after 5 imports in the window", () => {
		// Fresh user per run (resetDb gives new ids), so a retry gets its own
		// rate-limit bucket.
		cy.loginAs(users.alice.email, users.alice.password);
		for (let i = 0; i < 5; i++) {
			importComments([]).its("status").should("eq", 200);
		}
		importComments([]).then((res) => {
			expect(res.status).to.eq(429);
			expect(Number(res.headers["retry-after"])).to.be.greaterThan(0);
			expect(res.body.error).to.match(/importações/i);
		});
	});

	it("refuses a disabled account and writes nothing", () => {
		cy.loginAs(users.alice.email, users.alice.password);
		cy.sessionCookies().then((aliceSession) => {
			cy.clearCookies();
			cy.loginAs(users.mod.email, users.mod.password);
			cy.request({
				method: "PATCH",
				url: "/api/moderation/users",
				body: { email: users.alice.email, disabled: true },
			})
				.its("status")
				.should("eq", 200);

			cy.useSessionCookies(aliceSession);
			importComments([{ bookReference: "Gn 1:1", text: "Conta desativada." }])
				.its("status")
				.should("be.oneOf", [401, 403]);
		});
		commentCount(users.alice.email, users.alice.username).should("eq", 0);
	});

	describe("profile UI", () => {
		it("disables the import for an unverified account but keeps the export", () => {
			cy.loginAs(carol.email, carol.password);
			cy.visit("/profile?tab=config");
			cy.get('[data-testid="import-requires-verification"]')
				.should("be.visible")
				.and("contain", "Verifique seu e-mail");
			cy.contains("button", "Importar comentários (JSON)").should("be.disabled");
			cy.contains("a", "Exportar meus dados (JSON)").should(
				"have.attr",
				"href",
				"/api/users/me/export",
			);
		});

		it("shows the API's reason when the import is refused", () => {
			cy.loginAs(carol.email, carol.password);
			cy.visit("/profile?tab=config");
			cy.get('[data-testid="import-requires-verification"]').should("be.visible");
			// The button is disabled; drive the hidden input directly to prove
			// the 403 message reaches the user instead of a generic error.
			cy.get("#profile-import-file").selectFile(
				{
					contents: Cypress.Buffer.from(
						JSON.stringify({ comments: [{ bookReference: "Gn 1:1", text: "Oi" }] }),
					),
					fileName: "backup.json",
					mimeType: "application/json",
				},
				{ force: true },
			);
			cy.get('[role="alertdialog"]').contains("button", "Importar").click();
			cy.contains(/Verifique seu e-mail para participar/i).should("be.visible");
		});

		it("enables the import for a verified account", () => {
			cy.loginAs(users.alice.email, users.alice.password);
			cy.visit("/profile?tab=config");
			cy.contains("button", "Importar comentários (JSON)").should("be.enabled");
			cy.get('[data-testid="import-requires-verification"]').should("not.exist");
		});
	});
});
