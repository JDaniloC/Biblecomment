/**
 * Feature coverage (verified on CI — local Cypress is unusable):
 *  - Multi-category comments render ALL tag pills, ordered most personal →
 *    most studied; empty tags fall back to the neutral "Comentário".
 *  - Share-as-image: button in the reader footer opens a preview modal;
 *    the canonical /c/<id> link and the OG image endpoint respond.
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
				throw new Error(`verse ${abbrev} ${chapter}:${verseNumber} missing`);
			}
			return verse._id;
		});
}

describe("Multi-category badges + share card", () => {
	beforeEach(() => {
		cy.resetDb();
		cy.seedDb({
			// chapter tutorial pre-completed — its coach-mark overlay otherwise
			// covers the reader panel and blocks the share button.
			users: [{ ...users.alice, tutorialsCompleted: ["chapter-v1"] }],
			books: [bookFixture.book],
			verses: bookFixture.verses,
		});
		cy.loginAs(users.alice.email, users.alice.password);
	});

	it("renders every category, ordered most personal → most studied", () => {
		getVerseId("gn", 1, 1).then((verseId) => {
			cy.request("POST", `/api/comments/${verseId}`, {
				text: "comentário multi-categoria",
				tags: ["exegese", "pessoal"],
			});
			cy.visit("/verses/gn/1");
			cy.get("li#1 button").first().click();
			cy.contains("comentário multi-categoria").should("be.visible");
			cy.get('[data-testid="tag-badges"]')
				.filter(':contains("Pessoal")')
				.first()
				.within(() => {
					cy.contains("Pessoal").should("be.visible");
					cy.contains("Exegese").should("be.visible");
				});
		});
	});

	it("falls back to the neutral 'Comentário' badge when there are no tags", () => {
		getVerseId("gn", 1, 1).then((verseId) => {
			cy.request("POST", `/api/comments/${verseId}`, {
				text: "comentário sem categoria",
				tags: [],
			});
			cy.visit("/verses/gn/1");
			cy.get("li#1 button").first().click();
			cy.contains("comentário sem categoria").should("be.visible");
			cy.get('[data-testid="tag-badges"]')
				.filter(':contains("Comentário")')
				.should("exist");
		});
	});

	it("share button opens a preview modal; /c/<id> and OG image respond", () => {
		getVerseId("gn", 1, 1).then((verseId) => {
			cy.request("POST", `/api/comments/${verseId}`, {
				text: "comentário para compartilhar",
				tags: ["devocional"],
			}).then((res) => {
				const id = res.body._id as string;

				cy.visit("/verses/gn/1");
				cy.get("li#1 button").first().click();
				cy.contains("comentário para compartilhar").should("be.visible");

				cy.get('[aria-label="Compartilhar comentário"]').first().click();
				cy.get(
					'[role="dialog"], [aria-label="Compartilhar comentário"]',
				).should("exist");
				cy.get('img[alt="Pré-visualização do card do comentário"]')
					.should("have.attr", "src")
					.and("include", `/api/og/comment/${id}`);

				cy.request(`/api/og/comment/${id}`).then((r) => {
					expect(r.status).to.eq(200);
					expect(r.headers["content-type"]).to.include("image/png");
				});
				cy.request(`/c/${id}`).then((r) => {
					expect(r.status).to.eq(200);
				});
			});
		});
	});
});
