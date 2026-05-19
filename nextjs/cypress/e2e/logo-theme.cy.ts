/**
 * <Logo/> swaps to the dark-mode brand variant. The component renders
 * BOTH SVGs and lets the `.dark` class (next-themes) decide via CSS —
 * so exactly one is visible per theme, with no flash/JS. /login is
 * public and renders <Logo/>, so no seeding is needed.
 */
describe("Brand logo dark-mode variant", () => {
	it("shows logo.svg in light and logo-dark.svg in dark", () => {
		cy.visit("/login", {
			onBeforeLoad(win) {
				win.localStorage.setItem("theme", "light");
			},
		});
		cy.get('img[src="/assets/logo.svg"]').first().should("be.visible");
		cy.get('img[src="/assets/logo-dark.svg"]').first().should("not.be.visible");

		cy.visit("/login", {
			onBeforeLoad(win) {
				win.localStorage.setItem("theme", "dark");
			},
		});
		cy.get('img[src="/assets/logo-dark.svg"]').first().should("be.visible");
		cy.get('img[src="/assets/logo.svg"]').first().should("not.be.visible");
	});
});
