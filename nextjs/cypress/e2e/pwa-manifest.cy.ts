/**
 * PWA: manifest exposes shortcuts/share_target/launch_handler, and the
 * search page prefills + auto-runs from ?q= (so the manifest
 * share_target "/search?q={text}" and the "Buscar" app shortcut work).
 */
import users from "../fixtures/users.json";
import bookFixture from "../fixtures/book-gn.json";

describe("PWA manifest + share_target prefill", () => {
	it("manifest.webmanifest declares shortcuts/share_target/launch_handler", () => {
		cy.request("/manifest.webmanifest").then((res) => {
			expect(res.status).to.eq(200);
			const m = typeof res.body === "string" ? JSON.parse(res.body) : res.body;
			expect(m.id).to.eq("/");
			expect(m.shortcuts).to.have.length(4);
			expect(m.share_target.action).to.eq("/search");
			expect(m.share_target.params).to.deep.eq({ text: "q" });
			expect(m.launch_handler.client_mode).to.include("navigate-existing");
			// Task E: install prompts prefer the published Play app.
			expect(m.prefer_related_applications).to.eq(true);
			expect(m.related_applications[0].id).to.eq("br.com.biblecomment.app");
		});
	});

	it("/search?q= prefills the input and runs the search", () => {
		cy.resetDb();
		cy.seedDb({
			users: [users.alice],
			books: [bookFixture.book],
			verses: bookFixture.verses,
		});
		cy.loginAs(users.alice.email, users.alice.password);

		cy.visit("/search?q=principio");
		cy.get("#search-input").should("have.value", "principio");
		// Prefill triggers a search, so the empty-state hint is gone.
		cy.contains("Digite algo para buscar").should("not.exist");
	});
});
