/**
 * /admin/moderation now uses 3 tabs (Reports / Comentários / Usuários)
 * with the Usuários tab listing all cadastros newest-first and offering
 * inline promote/demote.
 */
import users from "../fixtures/users.json";
import bookFixture from "../fixtures/book-gn.json";

describe("Admin moderation — tabs + user listing", () => {
	beforeEach(() => {
		cy.resetDb();
		cy.seedDb({
			users: [users.alice, users.bob, users.mod].map((u) => ({
				...u,
				tutorialsCompleted: ["chapter-v1"],
			})),
			books: [bookFixture.book],
			verses: bookFixture.verses,
		});
		cy.loginAs(users.mod.email, users.mod.password);
		cy.visit("/admin/moderation");
	});

	it("renders three tabs and Reports is selected by default", () => {
		cy.get("[data-testid='tab-reports']").should("have.attr", "aria-selected", "true");
		cy.get("[data-testid='tab-comments']").should("have.attr", "aria-selected", "false");
		cy.get("[data-testid='tab-users']").should("have.attr", "aria-selected", "false");
		cy.contains("h1", "Comentários reportados").should("be.visible");
	});

	it("switches tabs and persists the active tab in the URL", () => {
		cy.get("[data-testid='tab-users']").click();
		cy.get("[data-testid='tab-users']").should("have.attr", "aria-selected", "true");
		cy.contains("h2", "Usuários cadastrados").should("be.visible");
		cy.location("search").should("include", "tab=users");
	});

	it("lists every seeded user on the Usuários tab", () => {
		cy.get("[data-testid='tab-users']").click();
		cy.get("[data-testid='admin-user-alice']").should("be.visible").and("contain.text", "alice@");
		cy.get("[data-testid='admin-user-bob']").should("be.visible");
		cy.get("[data-testid='admin-user-mod']")
			.should("be.visible")
			.and("contain.text", "Moderador");
	});

	it("promotes a regular user to moderator inline", () => {
		cy.get("[data-testid='tab-users']").click();
		cy.get("[data-testid='admin-user-alice']").within(() => {
			cy.contains("button", "Promover").click();
		});
		cy.contains("button", "Promover").click(); // confirmation dialog
		cy.get("[data-testid='admin-user-alice']").should("contain.text", "Moderador");
	});
});
