/**
 * plan_community read-path: ?community=<slug> partitions a verse's
 * comments into `prioritized` (by approved members) and `others`. The
 * reader's "Comunidade ativa" selector + "Ver outros comentários (N)"
 * toggle implement this on the client.
 *
 * Local Cypress is unusable on the maintainer's host — CI is the gate.
 */
import users from "../fixtures/users.json";
import bookFixture from "../fixtures/book-gn.json";

describe("Active-community read-path (plan_community)", () => {
	// alice authors a comment on Gn 1:1; she is the approved moderator of
	// "reformados". bob authors another comment; he is NOT a member.
	// Without ?community → both in `others`. With ?community=reformados →
	// alice in `prioritized`, bob in `others`.
	it("partitions comments by approved membership", () => {
		cy.resetDb();
		cy.seedDb({
			users: [users.alice, users.bob],
			books: [bookFixture.book],
			verses: bookFixture.verses,
			communities: [
				{
					slug: "reformados",
					name: "Reformados",
					description: "fixture",
					createdBy: users.alice.username,
					memberCount: 1,
				},
			],
			communityMemberships: [
				{
					username: users.alice.username,
					communitySlug: "reformados",
					status: "approved",
					role: "moderator",
				},
			],
			// Follow rows drive the picker (plan_community follow-up). Alice
			// follows her own community by default — approve auto-follows IRL,
			// but seeds inject rows directly.
			communityFollows: [
				{ username: users.alice.username, communitySlug: "reformados" },
			],
		});

		cy.loginAs(users.alice.email, users.alice.password);
		cy.request("GET", "/api/books/gn/verses/1").then((res) => {
			const v = (res.body as Array<{ _id: string; verseNumber: number }>).find(
				(x) => x.verseNumber === 1,
			);
			if (!v) throw new Error("Gn 1:1 not seeded");
			cy.request("POST", `/api/comments/${v._id}`, {
				text: "alice deve ser priorizada",
				tags: ["devocional"],
			});
			cy.clearCookies();
			cy.loginAs(users.bob.email, users.bob.password);
			cy.request("POST", `/api/comments/${v._id}`, {
				text: "bob não-membro",
				tags: ["pessoal"],
			});
		});

		// No community → everything in others.
		cy.request("GET", "/api/comments/chapter/gn/1/1").then((r) => {
			expect(
				r.body.prioritized,
				"no community → prioritized empty",
			).to.have.length(0);
			const names = (r.body.others ?? []).map(
				(c: { username: string }) => c.username,
			);
			expect(names).to.include.members(["alice", "bob"]);
		});

		// ?community=reformados → alice prioritized, bob in others.
		cy.request("GET", "/api/comments/chapter/gn/1/1?community=reformados").then(
			(r) => {
				const pri = (r.body.prioritized ?? []).map(
					(c: { username: string }) => c.username,
				);
				const oth = (r.body.others ?? []).map(
					(c: { username: string }) => c.username,
				);
				expect(pri).to.deep.eq(["alice"]);
				expect(oth).to.deep.eq(["bob"]);
			},
		);

		// Unknown slug → fallback (everything in others, prioritized empty).
		cy.request("GET", "/api/comments/chapter/gn/1/1?community=ghost").then(
			(r) => {
				expect(r.body.prioritized).to.have.length(0);
				expect(r.body.others).to.have.length(2);
			},
		);
	});

	it("reader UI exposes the active-community selector", () => {
		cy.resetDb();
		cy.seedDb({
			users: [users.alice],
			books: [bookFixture.book],
			verses: bookFixture.verses,
			communities: [
				{
					slug: "reformados",
					name: "Reformados",
					description: "fixture",
					createdBy: users.alice.username,
					memberCount: 1,
				},
			],
			communityMemberships: [
				{
					username: users.alice.username,
					communitySlug: "reformados",
					status: "approved",
					role: "moderator",
				},
			],
			// Follow rows drive the picker (plan_community follow-up). Alice
			// follows her own community by default — approve auto-follows IRL,
			// but seeds inject rows directly.
			communityFollows: [
				{ username: users.alice.username, communitySlug: "reformados" },
			],
		});
		cy.loginAs(users.alice.email, users.alice.password);
		cy.visit("/verses/gn/1");
		// Picker now lives in the AppHeader profile dropdown — click the
		// avatar to open it before asserting the combobox is mounted.
		cy.get('[aria-label="Menu da conta"]').click();
		cy.get('[data-testid="active-community-select"]').should("exist");
	});
});
