/**
 * App icon badge sync: when a user has unread notifications, the
 * launcher badge should reflect the count via the Badging API. When all
 * notifications are read, the badge should clear. The Badging API is
 * Chrome-only; we stub it on Cypress' Electron so we can observe calls.
 *
 * We `cy.intercept` the notifications endpoint to force a specific
 * `unread` count without having to drive the full UI flow that produces
 * a real notification.
 */
import users from "../fixtures/users.json";

type BadgeNavigator = Navigator & {
	setAppBadge: Cypress.Agent<sinon.SinonStub>;
	clearAppBadge: Cypress.Agent<sinon.SinonStub>;
};

function visitWithBadgeStub(path: string) {
	cy.visit(path, {
		onBeforeLoad(win) {
			(win.navigator as BadgeNavigator).setAppBadge = cy
				.stub()
				.as("setAppBadge")
				.resolves();
			(win.navigator as BadgeNavigator).clearAppBadge = cy
				.stub()
				.as("clearAppBadge")
				.resolves();
		},
	});
}

describe("App badge sync", () => {
	beforeEach(() => {
		cy.resetDb();
		cy.seedDb({
			users: [{ ...users.alice, tutorialsCompleted: ["chapter-v1"] }],
		});
		cy.loginAs(users.alice.email, users.alice.password);
	});

	it("clears the badge when the signed-in user has no unread notifications", () => {
		cy.intercept("GET", /\/api\/notifications/, {
			body: { page: 1, pageSize: 20, items: [], unread: 0 },
		}).as("notifPoll");
		visitWithBadgeStub("/home");
		cy.wait("@notifPoll");
		cy.get("@clearAppBadge").should("have.been.called");
		cy.get("@setAppBadge").should("not.have.been.called");
	});

	it("sets the badge to the unread count from the API", () => {
		cy.intercept("GET", /\/api\/notifications/, {
			body: { page: 1, pageSize: 20, items: [], unread: 3 },
		}).as("notifPoll");
		visitWithBadgeStub("/home");
		cy.wait("@notifPoll");
		// On mount, useNotifications fires syncAppBadge(0) for the initial
		// empty state and then syncAppBadge(3) once the poll resolves. We
		// only assert the second call (the meaningful one); the initial
		// clear is idempotent noise.
		cy.get("@setAppBadge").should("have.been.calledWith", 3);
	});
});
