/// <reference types="cypress" />

// Phase 1 offline navigation. Requires a PRODUCTION build (the service
// worker only registers when NODE_ENV === "production"), so this runs
// under `npm run cy:test`, not against `next dev`. Offline is emulated via
// the Chrome DevTools Protocol.
//
// Smoke test (known-flaky SW E2E): asserts that after one online visit,
// reloading the app offline shows the navigable book library instead of
// the generic "Sem conexão" page.

function setOffline(offline: boolean) {
  return Cypress.automation("remote:debugger:protocol", {
    command: "Network.emulateNetworkConditions",
    params: {
      offline,
      latency: 0,
      downloadThroughput: offline ? 0 : -1,
      uploadThroughput: offline ? 0 : -1,
    },
  });
}

describe("offline navigation (Phase 1)", () => {
  afterEach(() => setOffline(false));

  it("shows the navigable library when reloaded offline", () => {
    // 1. Online: load the home so the SW installs and caches the shell +
    //    book list, and wait for the SW to take control.
    cy.visit("/");
    cy.window().its("navigator.serviceWorker.controller").should("not.be.null");
    cy.findByText(/Navegue pelos Livros/i).should("be.visible");

    // 2. Go offline and reload the app entry point.
    cy.then(() => setOffline(true));
    cy.reload();

    // 3. Offline, we must still see the navigable library — NOT the
    //    generic "Sem conexão" offline page.
    cy.findByText(/Navegue pelos Livros/i).should("be.visible");
    cy.contains(/Sem conex[aã]o/i).should("not.exist");
  });
});
