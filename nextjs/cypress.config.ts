import { defineConfig } from "cypress";
import {
  resetDatabase,
  seedDatabase,
  findUserByEmail,
  insertResetToken,
  countResetTokensForEmail,
  seedChapterRead,
  countChapterReads,
  getUserBadges,
  type InsertResetTokenInput,
} from "./cypress/tasks/db";
import { assertLocalMongoUri } from "./cypress/tasks/safety";

export default defineConfig({
  e2e: {
    // CYPRESS_BASE_URL is set by scripts/cy-test.js so the server port
    // (default 5050, override via CYPRESS_PORT) stays in sync with the
    // baseUrl Cypress uses for cy.visit / cy.request.
    baseUrl: process.env.CYPRESS_BASE_URL || "http://localhost:5050",
    specPattern: "cypress/e2e/**/*.cy.{ts,tsx}",
    supportFile: "cypress/support/e2e.ts",
    fixturesFolder: "cypress/fixtures",
    video: false,
    screenshotOnRunFailure: true,
    experimentalRunAllSpecs: true,
    setupNodeEvents(on) {
      // Refuse to register DB-mutating tasks if Cypress was started with a
      // non-local MONGODB_URI. This catches `cypress run` invoked directly
      // (bypassing scripts/cy-test.js) when the shell has a prod URI set.
      assertLocalMongoUri(process.env.MONGODB_URI, "cypress.config setupNodeEvents");

      on("task", {
        async "db:reset"() {
          await resetDatabase();
          return null;
        },
        async "db:seed"(payload: Parameters<typeof seedDatabase>[0]) {
          await seedDatabase(payload);
          return null;
        },
        async "db:findUser"(email: string) {
          return await findUserByEmail(email);
        },
        async "db:insertResetToken"(input: InsertResetTokenInput) {
          await insertResetToken(input);
          return null;
        },
        async "db:countResetTokens"(email: string) {
          return await countResetTokensForEmail(email);
        },
        async "db:seedChapterRead"(input: { email: string; abbrev: string; chapter: number }) {
          await seedChapterRead(input);
          return null;
        },
        async "db:countChapterReads"(email: string) {
          return await countChapterReads(email);
        },
        async "db:getUserBadges"(email: string) {
          return await getUserBadges(email);
        },
      });
    },
  },
});
