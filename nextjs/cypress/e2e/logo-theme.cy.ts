/**
 * <Logo/> swaps to the dark-mode brand variant. The component renders
 * BOTH SVGs (data-testid="brand-logo") and lets the `.dark` class
 * (next-themes) decide via CSS — exactly one visible per theme, no
 * flash/JS. /login is public and renders <Logo/>, so no seeding.
 *
 * Robust to multiple <Logo/> instances / DOM order / breakpoints:
 * fixed viewport, assert EVERY visible brand-logo has the expected
 * src, and that at least one is visible.
 */
describe("Brand logo dark-mode variant", () => {
	function assertVisibleLogoSrc(expected: string) {
		cy.get('[data-testid="brand-logo"]')
			.filter(":visible")
			.should("have.length.greaterThan", 0)
			.each(($img) => {
				expect($img.attr("src")).to.eq(expected);
			});
	}

	beforeEach(() => cy.viewport(1280, 800));

	it("shows logo.svg in light mode", () => {
		cy.visit("/login", {
			onBeforeLoad: (win) => win.localStorage.setItem("theme", "light"),
		});
		assertVisibleLogoSrc("/assets/logo.svg");
	});

	it("shows logo-dark.svg in dark mode", () => {
		cy.visit("/login", {
			onBeforeLoad: (win) => win.localStorage.setItem("theme", "dark"),
		});
		assertVisibleLogoSrc("/assets/logo-dark.svg");
	});
});
