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
		// Confirm in the dialog — scope to the alertdialog so we don't match
		// the row's own "Promover" button (the centered modal overlaps it).
		cy.get('[role="alertdialog"]').contains("button", "Promover").click();
		cy.get("[data-testid='admin-user-alice']").should("contain.text", "Moderador");
	});

	it("disables a user inline and surfaces the Desativado badge", () => {
		cy.get("[data-testid='tab-users']").click();
		// Disable is a light action — no confirmation dialog.
		cy.get("[data-testid='disable-toggle-alice']").click();
		cy.get("[data-testid='user-disabled-badge-alice']").should("be.visible");
		cy.get("[data-testid='disable-toggle-alice']").should(
			"contain.text",
			"Reativar",
		);
	});

	it("deleting a user from the Usuários tab opens a confirmation dialog", () => {
		cy.get("[data-testid='tab-users']").click();
		cy.get("[data-testid='delete-user-alice']").click();
		cy.get('[role="alertdialog"]').should("be.visible");
		cy.contains("Excluir esta conta?").should("be.visible");
	});

	it("hides a comment from the Comentários tab (light action — no dialog)", () => {
		cy.task<{ id: string }>("db:seedComment", {
			username: "alice",
			abbrev: "gn",
			chapter: 1,
			verseNumber: 1,
			text: "comentário para ocultar pela UI de moderação",
		}).then(({ id }) => {
			cy.visit("/admin/moderation?tab=comments");
			cy.get(`[data-testid="hide-toggle-${id}"]`).should("be.visible").click();
			// The button flips to "Reexibir" once hidden — no confirm dialog.
			cy.get(`[data-testid="hide-toggle-${id}"]`).should(
				"contain.text",
				"Reexibir",
			);
		});
	});
});
