/**
 * Comment action labels collapse to icon-only on narrow viewports so the
 * row doesn't overflow when 4+ actions are visible (Útil / Contribuir /
 * Compartilhar / Reportar — plus Verify/Edit/Delete for moderators or
 * owners). Spans carry `sr-only sm:not-sr-only` — visually 1px below
 * Tailwind's sm breakpoint (640px), normal width at sm+.
 *
 * We assert the rendered bounding-box width because Cypress' `:visible`
 * check treats sr-only (1×1 px with overflow:hidden) as visible.
 */
import users from "../fixtures/users.json";
import bookFixture from "../fixtures/book-gn.json";

const COMMENT_TEXT = "Comentário para o teste de labels responsivos.";

function seedAndComment(): void {
	cy.resetDb();
	cy.seedDb({
		users: [users.alice].map((u) => ({
			...u,
			tutorialsCompleted: ["chapter-v1"],
		})),
		books: [bookFixture.book],
		verses: bookFixture.verses,
	});
	cy.loginAs(users.alice.email, users.alice.password);
	cy.request("GET", "/api/books/gn/verses/1").then((res) => {
		const v = (res.body as Array<{ _id: string; verseNumber: number }>).find(
			(it) => it.verseNumber === 1,
		);
		if (!v) throw new Error("Gn 1:1 should be seeded");
		cy.request("POST", `/api/comments/${v._id}`, {
			text: COMMENT_TEXT,
			tags: ["devocional"],
		});
	});
}

function openVersePanel(): void {
	cy.visit("/verses/gn/1");
	cy.contains("button", "No princípio").click();
	// Wait for the seeded comment to render in the side panel.
	cy.contains(COMMENT_TEXT).should("be.visible");
}

describe("Comment action labels — responsive collapse", () => {
	beforeEach(seedAndComment);

	it("collapses Útil / Contribuir / Compartilhar labels below sm (412×915)", () => {
		cy.viewport(412, 915);
		openVersePanel();

		// Each label-bearing span has sr-only sm:not-sr-only: at this viewport
		// only `sr-only` applies → bounding-box width ≈ 1px.
		cy.contains("span", /^Útil · $/).then(($span) => {
			expect($span[0].getBoundingClientRect().width).to.be.lessThan(5);
		});
		cy.contains("span", "Contribuir").then(($span) => {
			expect($span[0].getBoundingClientRect().width).to.be.lessThan(5);
		});
		cy.contains("span", "Compartilhar").then(($span) => {
			expect($span[0].getBoundingClientRect().width).to.be.lessThan(5);
		});
		// Like count digit stays visible (outside the sr-only span).
		cy.get("button[title='Útil']").should("contain.text", "0").and("be.visible");
	});

	it("expands the same labels at sm+ (1024×768)", () => {
		cy.viewport(1024, 768);
		openVersePanel();

		cy.contains("span", /^Útil · $/).then(($span) => {
			expect($span[0].getBoundingClientRect().width).to.be.greaterThan(15);
		});
		cy.contains("span", "Contribuir").then(($span) => {
			expect($span[0].getBoundingClientRect().width).to.be.greaterThan(15);
		});
		cy.contains("span", "Compartilhar").then(($span) => {
			expect($span[0].getBoundingClientRect().width).to.be.greaterThan(15);
		});
	});
});
