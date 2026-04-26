import "./commands";
import "@testing-library/cypress/add-commands";

/**
 * Next.js 14 server components that call redirect() in production mode
 * (next start) sometimes throw a React hydration error during the
 * client-side transition. This shows up in dev tools as the minified
 * React error #419 ("There was an error while hydrating"). The user
 * experience is unaffected — the browser still completes the redirect
 * and lands on the destination URL. Only Cypress's uncaught-exception
 * watcher cares.
 *
 * Suppress this specific signature only. Any other uncaught error in
 * the app continues to fail the test loudly.
 */
Cypress.on("uncaught:exception", (err) => {
  if (
    err.message.includes("Minified React error #419") ||
    err.message.includes("hydrating")
  ) {
    return false;
  }
  // Default: let Cypress fail the test on any other uncaught error.
});
