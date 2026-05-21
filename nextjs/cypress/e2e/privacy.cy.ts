/**
 * Privacy page must mention push subscription handling — guards the LGPD
 * disclosure required for Play Data Safety. If this assertion regresses,
 * the page silently drops a declared data-collection point and the Play
 * listing diverges from reality.
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
});
