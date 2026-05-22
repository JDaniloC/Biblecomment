/**
 * Daily reading-reminder opt-in: switch in /profile → Configurações
 * persists across reload and round-trips through the API. The hour
 * picker is hidden while the switch is off.
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

	it("?tab=config deep-links straight to the reminder card", () => {
		// The onboarding "Configurar lembrete" link relies on this — it must
		// open the Configurações tab without a manual click.
		cy.visit("/profile?tab=config");
		cy.get("[data-testid='reading-reminder-card']").should("be.visible");
	});

	it("starts off; the hour picker is hidden", () => {
		cy.visit("/profile");
		openConfigTab();
		cy.get("[data-testid='reading-reminder-enabled']").should(
			"have.attr",
			"aria-checked",
			"false",
		);
		cy.get("[data-testid='reading-reminder-hour-row']").should("not.exist");
	});

	it("flipping the switch reveals the hour picker", () => {
		cy.visit("/profile");
		openConfigTab();
		cy.get("[data-testid='reading-reminder-enabled']").click();
		cy.get("[data-testid='reading-reminder-enabled']").should(
			"have.attr",
			"aria-checked",
			"true",
		);
		cy.get("[data-testid='reading-reminder-hour-row']").should("be.visible");
		cy.get("[data-testid='reading-reminder-hour']").should("have.value", "8");
	});

	it("saves a new value and reloads it on next visit", () => {
		cy.visit("/profile");
		openConfigTab();
		cy.get("[data-testid='reading-reminder-enabled']").click();
		cy.get("[data-testid='reading-reminder-hour']").select("7.5");
		cy.contains("button", "Salvar lembrete").click();
		cy.contains("Lembrete diário ativado às 07:30").should("be.visible");

		cy.reload();
		openConfigTab();
		cy.get("[data-testid='reading-reminder-enabled']").should(
			"have.attr",
			"aria-checked",
			"true",
		);
		cy.get("[data-testid='reading-reminder-hour']").should("have.value", "7.5");
	});

	it("turning the switch off hides the picker and persists", () => {
		cy.request("PUT", "/api/me/reading-reminder", {
			enabled: true,
			hourLocal: 9,
		});
		cy.visit("/profile");
		openConfigTab();
		cy.get("[data-testid='reading-reminder-enabled']").should(
			"have.attr",
			"aria-checked",
			"true",
		);

		cy.get("[data-testid='reading-reminder-enabled']").click();
		cy.get("[data-testid='reading-reminder-hour-row']").should("not.exist");
		cy.contains("button", "Salvar lembrete").click();
		cy.contains("Lembrete diário desativado.").should("be.visible");

		cy.reload();
		openConfigTab();
		cy.get("[data-testid='reading-reminder-enabled']").should(
			"have.attr",
			"aria-checked",
			"false",
		);
	});
});
