/**
 * In a TWA/installed-PWA on Android, hitting the hardware back button at
 * the launch page would close the app instantly. useExitConfirmation
 * intercepts the first back with a toast and only lets the second back
 * (within 2s) through.
 *
 * Cypress isn't running in standalone display-mode, so we monkey-patch
 * `matchMedia` before navigation to convince the hook it's in a TWA.
 * Popstate is dispatched manually because we don't have an Android back
 * key.
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

describe("Back-button exit confirmation (TWA-only)", () => {
	beforeEach(() => {
		cy.resetDb();
	});

	it("first back shows the toast and stays on the page", () => {
		visitAsStandalone("/");
		cy.location("pathname").should("eq", "/");
		// Wait for the hook to have pushed its sentinel history entry.
		cy.wait(100);

		cy.window().then((win) => {
			win.dispatchEvent(new PopStateEvent("popstate"));
		});

		cy.contains("Pressione novamente para sair").should("be.visible");
		cy.location("pathname").should("eq", "/");
	});

	it("does not arm the toast in a regular browser tab (no standalone mode)", () => {
		// No matchMedia override here — default browser display-mode.
		cy.visit("/");
		cy.wait(100);

		cy.window().then((win) => {
			// No sentinel was pushed, so popstate may or may not actually
			// fire — what matters is the toast does NOT appear.
			win.dispatchEvent(new PopStateEvent("popstate"));
		});

		cy.contains("Pressione novamente para sair").should("not.exist");
	});
});
