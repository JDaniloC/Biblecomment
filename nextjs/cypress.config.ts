import { defineConfig } from "cypress";
import { resetDatabase, seedDatabase } from "./cypress/tasks/db";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:5000",
    specPattern: "cypress/e2e/**/*.cy.{ts,tsx}",
    supportFile: "cypress/support/e2e.ts",
    fixturesFolder: "cypress/fixtures",
    video: false,
    screenshotOnRunFailure: true,
    experimentalRunAllSpecs: true,
    setupNodeEvents(on) {
      on("task", {
        async "db:reset"() {
          await resetDatabase();
          return null;
        },
        async "db:seed"(payload: Parameters<typeof seedDatabase>[0]) {
          await seedDatabase(payload);
          return null;
        },
      });
    },
  },
});
