/**
 * First-launch onboarding tour. Shows once when the app runs as an
 * installed TWA (display-mode: standalone) and never in a regular tab.
 * Cypress isn't standalone, so we monkey-patch matchMedia before load.
 */

function visitAsStandalone(path: string) {
	cy.visit(path, {
		onBeforeLoad(win) {
			const original = win.matchMedia.bind(win);
			win.matchMedia = (query: string) =>
				query.includes("standalone")
					? ({
							matches: true,
							media: query,
							onchange: null,
							addEventListener() {},
							removeEventListener() {},
							addListener() {},
							removeListener() {},
							dispatchEvent: () => false,
						} as unknown as MediaQueryList)
					: original(query);
		},
	});
}

describe("Mobile onboarding tour (TWA-only)", () => {
	beforeEach(() => {
		cy.resetDb();
	});

	it("shows on first standalone launch and walks the 3 slides", () => {
		visitAsStandalone("/");
		cy.get("[data-testid='onboarding-tour']").should("be.visible");
		cy.contains("Bem-vindo ao Bible Comment").should("be.visible");

		cy.get("[data-testid='onboarding-next']").click();
		cy.contains("Fique por dentro").should("be.visible");

		cy.get("[data-testid='onboarding-next']").click();
		cy.contains("Crie o hábito").should("be.visible");

		// Last slide → "Começar" closes the tour and sets the seen flag.
		cy.get("[data-testid='onboarding-next']").click();
		cy.get("[data-testid='onboarding-tour']").should("not.exist");
		cy.window().then((win) => {
			expect(win.localStorage.getItem("bc:onboarding-twa-v1-seen")).to.eq("1");
		});
	});

	it("does not show again once seen", () => {
		visitAsStandalone("/");
		cy.get("[data-testid='onboarding-skip']").click();
		cy.get("[data-testid='onboarding-tour']").should("not.exist");

		// Second standalone launch — flag persists, tour stays hidden.
		visitAsStandalone("/");
		cy.get("[data-testid='onboarding-tour']").should("not.exist");
	});

	it("never shows in a regular browser tab", () => {
		cy.visit("/"); // no standalone override
		cy.get("[data-testid='onboarding-tour']").should("not.exist");
	});
});
