/**
 * Privacy page must mention push subscription handling — guards the LGPD
 * disclosure required for Play Data Safety. If this assertion regresses,
 * the page silently drops a declared data-collection point and the Play
 * listing diverges from reality. The other cases pin the processors, the
 * deletion record and the session revocation the code now does.
 */
describe("Privacy page — LGPD disclosures", () => {
	beforeEach(() => {
		cy.visit("/privacy");
	});

	it("declares the push subscription data point", () => {
		cy.contains(/Assinatura de notificações push/i).should("be.visible");
		cy.contains(/endpoint/i).should("be.visible");
	});

	it("explains the push delivery service operators", () => {
		cy.contains(/FCM|autopush|APNs/i).should("be.visible");
	});

	it("names the processors and the international transfer safeguard", () => {
		for (const processor of ["Netlify", "MongoDB Atlas", "Resend", "Cloudflare (R2)", "Sentry"]) {
			cy.contains("li", processor).should("be.visible");
		}
		cy.contains(/art\. 33 da LGPD/i).should("be.visible");
	});

	it("discloses the deletion record kept so backups can't re-create an account", () => {
		cy.contains(
			/guardamos apenas o identificador interno da conta e a data da exclusão/i,
		).should("be.visible");
	});

	it("explains that a password change or reset ends sessions", () => {
		cy.contains(/encerramos as sessões abertas nos demais dispositivos/i).should(
			"be.visible",
		);
		cy.contains(/encerramos todas as sessões da conta/i).should("be.visible");
	});
});
