/**
 * Daily reading-reminder opt-in: toggle in /profile → Configurações
 * persists across reload and round-trips through the API.
 */
import users from "../fixtures/users.json";

function openConfigTab() {
	cy.contains("button", "Configurações").click();
	cy.get("[data-testid='reading-reminder-card']").should("be.visible");
}

describe("Reading reminder preference", () => {
	beforeEach(() => {
		cy.resetDb();
		cy.seedDb({
			users: [{ ...users.alice, tutorialsCompleted: ["chapter-v1"] }],
		});
		cy.loginAs(users.alice.email, users.alice.password);
	});

	it("starts disabled by default with 08:00 selected", () => {
		cy.visit("/profile");
		openConfigTab();
		cy.get("[data-testid='reading-reminder-enabled']").should("not.be.checked");
		cy.get("[data-testid='reading-reminder-hour']").should("have.value", "8");
	});

	it("saves a new value and reloads it on next visit", () => {
		cy.visit("/profile");
		openConfigTab();
		cy.get("[data-testid='reading-reminder-enabled']").check();
		cy.get("[data-testid='reading-reminder-hour']").select("7.5");
		cy.contains("button", "Salvar lembrete").click();
		cy.contains("Lembrete diário ativado às 07:30").should("be.visible");

		cy.reload();
		openConfigTab();
		cy.get("[data-testid='reading-reminder-enabled']").should("be.checked");
		cy.get("[data-testid='reading-reminder-hour']").should("have.value", "7.5");
	});

	it("disabling also persists", () => {
		cy.request("PUT", "/api/me/reading-reminder", {
			enabled: true,
			hourLocal: 9,
		});
		cy.visit("/profile");
		openConfigTab();
		cy.get("[data-testid='reading-reminder-enabled']").should("be.checked");

		cy.get("[data-testid='reading-reminder-enabled']").uncheck();
		cy.contains("button", "Salvar lembrete").click();
		cy.contains("Lembrete diário desativado.").should("be.visible");

		cy.reload();
		openConfigTab();
		cy.get("[data-testid='reading-reminder-enabled']").should("not.be.checked");
	});
});
