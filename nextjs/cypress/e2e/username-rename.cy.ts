/**
 * Username rename cascade against a real database: everything keyed by the
 * old slug follows the account, and the old slug is released only once the
 * cascade finished (UpdateUsernameUseCase keeps it held as `renameFrom`).
 */

import users from "../fixtures/users.json";
import bookFixture from "../fixtures/book-gn.json";

const NEW_SLUG = "alice-novo";

describe("Username rename cascade", () => {
	beforeEach(() => {
		cy.resetDb();
		cy.seedDb({
			users: [users.alice, users.bob],
			books: [bookFixture.book],
			verses: bookFixture.verses,
		});
	});

	it("moves alice's comments, devices and reminder to the new slug, then frees the old one", () => {
		cy.task("db:seedComment", {
			username: users.alice.username,
			abbrev: "gn",
			chapter: 1,
			verseNumber: 1,
			text: "No princípio Deus criou os céus e a terra.",
		});
		cy.loginAs(users.alice.email, users.alice.password);
		cy.request("POST", "/api/push/subscribe", {
			endpoint: "https://push.example.test/alice-device",
			keys: { p256dh: "p256dh-key", auth: "auth-key" },
		});
		cy.request("PUT", "/api/me/reading-reminder", { enabled: true, hourLocal: 7 });

		cy.visit("/profile?tab=config");
		cy.get("#profile-username").clear().type(NEW_SLUG);
		cy.get("#profile-username").closest("div.flex.gap-2").find("button").click();
		cy.contains("Identificador atualizado.").should("be.visible");

		cy.task<string>("db:getUserId", users.alice.email).then((userId) => {
			cy.task<Record<string, number>>("db:countUserRefs", {
				userId,
				username: NEW_SLUG,
			}).then((refs) => {
				expect(refs.users, "account renamed").to.eq(1);
				expect(refs.comments, "comments moved").to.eq(1);
				expect(refs.pushsubscriptions, "devices moved").to.eq(1);
				expect(refs.readingreminderpreferences, "reminder moved").to.eq(1);
			});
			cy.task<Record<string, number>>("db:countUserRefs", {
				userId,
				username: users.alice.username,
			}).then((refs) => {
				expect(refs.comments).to.eq(0);
				expect(refs.pushsubscriptions).to.eq(0);
				expect(refs.readingreminderpreferences).to.eq(0);
			});
		});

		// The session follows the rename (DB is the source of truth for claims).
		cy.request("/api/auth/session")
			.its("body.user.username")
			.should("eq", NEW_SLUG);

		// The cascade finished, so the old slug is free again.
		cy.clearCookies();
		cy.request("POST", "/api/users", {
			email: "outra-alice@example.com",
			displayName: "Outra Alice",
			username: users.alice.username,
			password: "outra-senha-123",
			acceptedTerms: true,
		})
			.its("status")
			.should("eq", 201);
	});

	it("doesn't let anyone take a slug that another account holds", () => {
		cy.request({
			method: "POST",
			url: "/api/users",
			body: {
				email: "impostor@example.com",
				displayName: "Impostor",
				username: users.bob.username,
				password: "impostor-123",
				acceptedTerms: true,
			},
			failOnStatusCode: false,
		})
			.its("status")
			.should("eq", 409);
	});
});
