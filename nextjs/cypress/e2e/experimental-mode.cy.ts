/**
 * "Modo experimental" switch in /profile → Configurações: off by default, kept on
 * this device (localStorage bc:experimental) across reloads, and turned off again
 * without leaving the key behind. What it does to the player is covered in
 * audio-player.cy.ts.
 */
import users from "../fixtures/users.json";

function openConfigTab() {
	cy.contains("button", "Configurações").click();
	cy.get("[data-testid='experimental-mode-card']").should("be.visible");
}

describe("Experimental mode setting", () => {
	beforeEach(() => {
		cy.resetDb();
		cy.seedDb({
			// All tours done so none auto-opens on /profile and covers the switch
			// (mirrors src/lib/tutorial-config.ts).
			users: [
				{
					...users.alice,
					tutorialsCompleted: [
						"home-v1",
						"chapter-v1",
						"communities-v1",
						"discussions-v1",
						"profile-v1",
					],
				},
			],
		});
		cy.loginAs(users.alice.email, users.alice.password);
	});

	it("starts off, stays on after a reload, and turns off again", () => {
		cy.visit("/profile");
		openConfigTab();
		cy.get("[data-testid='experimental-mode-toggle']").should("have.attr", "aria-checked", "false");

		cy.get("[data-testid='experimental-mode-toggle']").click();
		cy.get("[data-testid='experimental-mode-toggle']").should("have.attr", "aria-checked", "true");
		cy.window().its("localStorage").invoke("getItem", "bc:experimental").should("equal", "1");

		cy.reload();
		openConfigTab();
		cy.get("[data-testid='experimental-mode-toggle']").should("have.attr", "aria-checked", "true");

		cy.get("[data-testid='experimental-mode-toggle']").click();
		cy.get("[data-testid='experimental-mode-toggle']").should("have.attr", "aria-checked", "false");
		cy.window().its("localStorage").invoke("getItem", "bc:experimental").should("equal", null);
	});
});
