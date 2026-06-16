/// <reference types="cypress" />

/**
 * Email verification end-to-end tests.
 *
 * Drives the user-facing happy path: seeded unverified user is blocked
 * from posting, requests the verification email, follows the magic link,
 * and afterwards can post + the verified badge appears on their public
 * profile.
 *
 * Also exercises the email-change flow: verified user changes email →
 * pending state → magic link goes to NEW address → confirm → new email
 * shown, badge persists.
 *
 * EMAIL_TRANSPORT=memory is set by scripts/cy-test.js — verification
 * emails land in the in-process inbox, readable via /api/dev/last-email.
 */

import bookFixture from "../fixtures/book-gn.json";

interface MemoryEmail {
	to: string;
	subject: string;
	html: string;
	text: string;
}

function fetchLatestVerificationEmail(
	toEmail: string,
	attemptsLeft = 10,
): Cypress.Chainable<MemoryEmail> {
	return cy
		.request<{ messages: MemoryEmail[] }>("/api/dev/last-email")
		.then((res) => {
			const inbox = (res.body.messages ?? []) as MemoryEmail[];
			const found = [...inbox]
				.reverse()
				.find(
					(msg) =>
						msg.to.toLowerCase() === toEmail.toLowerCase() &&
						/confirme|verif/i.test(msg.subject),
				);
			if (found) return cy.wrap(found);
			if (attemptsLeft <= 0) {
				throw new Error(
					`No verification email for ${toEmail} after polling (inbox has ${inbox.length} message(s))`,
				);
			}
			// The send action is fire-and-forget — the email may not have been
			// written to the dev inbox yet. Wait briefly and poll again instead of
			// failing on the first empty read (the race that flaked this spec).
			return cy
				.wait(300)
				.then(() => fetchLatestVerificationEmail(toEmail, attemptsLeft - 1));
		});
}

function extractToken(text: string): string {
	const match = text.match(/\/verify-email\?token=([\w-]+)/);
	if (!match) {
		throw new Error(`No /verify-email?token= link in body:\n${text}`);
	}
	return match[1];
}

function clearInbox(): Cypress.Chainable<unknown> {
	return cy.request({
		method: "DELETE",
		url: "/api/dev/last-email",
		failOnStatusCode: false,
	});
}

describe("Email verification", () => {
	const seed = Math.random().toString(36).slice(2, 8);
	const username = `verify_${seed}`;
	const email1 = `verify_${seed}@cypress.test`;
	const email2 = `verify2_${seed}@cypress.test`;
	const password = "verify-secret-123";

	beforeEach(() => {
		cy.resetDb();
		cy.seedDb({
			users: [
				{
					email: email1,
					username,
					password,
					// The whole point of this spec is to drive the unverified-user flow.
					emailVerified: false,
					tutorialsCompleted: [
						"chapter-v1",
						"home-v1",
						"communities-v1",
						"discussions-v1",
						"profile-v1",
					],
				},
			],
			books: [bookFixture.book],
			verses: bookFixture.verses,
		});
		clearInbox();
	});

	// ─────────────────────────────────────────────────────────────────────────
	it("blocks comment creation while unverified", () => {
		cy.loginAs(email1, password);

		// The verse id is needed to POST a comment; resolve via the public API.
		cy.request("GET", "/api/books/gn/verses/1").then((res) => {
			const verse = (
				res.body as Array<{ _id: string; verseNumber: number }>
			).find((v) => v.verseNumber === 1);
			if (!verse) throw new Error("verse Gn 1:1 should be seeded");

			cy.request({
				method: "POST",
				url: `/api/comments/${verse._id}`,
				body: {
					text: `Comentário tentando ser publicado sem verificação. Texto longo o suficiente para satisfazer o limite mínimo ${"de duzentos caracteres exigidos pelo sistema. ".repeat(2)}`,
					tags: ["devocional"],
				},
				failOnStatusCode: false,
			}).then((createRes) => {
				expect(createRes.status).to.be.oneOf([400, 401, 403, 422]);
				// The exact wording comes from EmailNotVerifiedError's default message.
				expect(JSON.stringify(createRes.body)).to.match(
					/verifique seu e-?mail/i,
				);
			});
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	it("global banner is visible on /home for unverified users", () => {
		cy.loginAs(email1, password);
		cy.visit("/home");
		cy.get('[data-testid="email-verification-banner"]').should("be.visible");
	});

	// ─────────────────────────────────────────────────────────────────────────
	it("profile config card shows 'Não verificado' and triggers send", () => {
		cy.loginAs(email1, password);
		cy.visit("/profile?tab=config");
		cy.get('[data-testid="email-verification-card"]').should("exist");
		cy.get('[data-testid="email-verification-state-unverified"]').should(
			"be.visible",
		);

		// Trigger the send and confirm an email lands in the in-memory inbox.
		cy.get('[data-testid="email-verification-send"]').click();
		fetchLatestVerificationEmail(email1).then((mail) => {
			expect(mail.text).to.match(/verify-email\?token=/);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	it("verifying via the magic link unlocks commenting + shows the badge", () => {
		cy.loginAs(email1, password);

		// Trigger the send from /profile.
		cy.visit("/profile?tab=config");
		cy.get('[data-testid="email-verification-send"]').click();

		// Follow the link in the email.
		fetchLatestVerificationEmail(email1).then((mail) => {
			const token = extractToken(mail.text);
			cy.visit(`/verify-email?token=${token}`);
			cy.get('[data-testid="verify-email-confirm"]').click();
			cy.get('[data-testid="verify-email-success"]').should("be.visible");
		});

		// Now the API accepts a new comment.
		cy.request("GET", "/api/books/gn/verses/1").then((res) => {
			const verse = (
				res.body as Array<{ _id: string; verseNumber: number }>
			).find((v) => v.verseNumber === 1);
			if (!verse) throw new Error("verse Gn 1:1 should be seeded");

			cy.request({
				method: "POST",
				url: `/api/comments/${verse._id}`,
				body: {
					text: `Comentário publicado após a verificação do e-mail. Texto longo o suficiente para satisfazer o limite mínimo ${"de duzentos caracteres exigidos pelo sistema. ".repeat(2)}`,
					tags: ["devocional"],
				},
			}).then((createRes) => {
				expect(createRes.status).to.eq(201);
			});
		});

		// Public profile shows the verified badge in the header.
		cy.visit(`/u/${username}`);
		cy.get('[data-testid="public-profile-header"]')
			.find('[data-testid="verified-badge"]')
			.should("exist");
	});

	// ─────────────────────────────────────────────────────────────────────────
	it("email change: pending state, mail goes to NEW address, badge persists after confirm", () => {
		// Pre-verify the user so we exercise the change-from-verified path.
		// (The seedDb default would also work, but we override here to be
		// explicit about the starting state of this scenario.)
		cy.resetDb();
		cy.seedDb({
			users: [
				{
					email: email1,
					username,
					password,
					emailVerified: true,
					tutorialsCompleted: [
						"chapter-v1",
						"home-v1",
						"communities-v1",
						"discussions-v1",
						"profile-v1",
					],
				},
			],
			books: [bookFixture.book],
			verses: bookFixture.verses,
		});
		clearInbox();

		cy.loginAs(email1, password);
		cy.visit("/profile?tab=config");
		cy.get('[data-testid="email-verification-new-email"]').clear().type(email2);
		cy.get('[data-testid="email-verification-change-submit"]').click();
		cy.get('[data-testid="email-verification-pending"]').should(
			"contain",
			email2,
		);

		// The verification email MUST be sent to the NEW address.
		fetchLatestVerificationEmail(email2).then((mail) => {
			const token = extractToken(mail.text);
			cy.visit(`/verify-email?token=${token}`);
			cy.get('[data-testid="verify-email-confirm"]').click();
			cy.get('[data-testid="verify-email-success"]').should("be.visible");
		});

		// After email-change confirmation the user's primary email in the DB is
		// now email2. Re-login so the session JWT carries the new email before
		// we visit /profile — otherwise /api/users/me would query by email1 and
		// return 401.
		cy.loginAs(email2, password);
		cy.visit("/profile?tab=config");
		// Longer timeout: under the full-suite CI load the verified badge can
		// take >4s to paint, which flaked this assertion.
		cy.get('[data-testid="email-verification-state-verified"]', {
			timeout: 10000,
		}).should("be.visible");
		cy.contains(email2);
	});
});
