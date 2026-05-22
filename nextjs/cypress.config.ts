import { defineConfig } from "cypress";
import {
  resetDatabase,
  seedDatabase,
  findUserByEmail,
  insertResetToken,
  countResetTokensForEmail,
  seedChapterRead,
  seedComment,
  countChapterReads,
  countCommentLikesByUser,
  countLikesForComment,
  countCommentReportsByUser,
  countReportsForComment,
  countHiddenCommentsByUsername,
  countAnswersByUser,
  countAnswersForDiscussion,
  getUserBadges,
  type InsertResetTokenInput,
  type SeedCommentInput,
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
    // The 15-spec suite runs in a single Electron process and accumulates
    // memory + paint backpressure as it progresses — timings can stretch
    // 2–3x past spec 10. Specs that pass cleanly in isolation occasionally
    // hit element-visibility or hydration timeouts under that load (the
    // mode varies run-to-run, so it's not a localised bug). Two retries
    // in CI mode absorbs that variance; logic regressions still fail
    // because they'd reproduce across all three attempts.
    retries: { runMode: 2, openMode: 0 },
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
        async "db:seedComment"(input: SeedCommentInput) {
          return await seedComment(input);
        },
        async "db:countChapterReads"(email: string) {
          return await countChapterReads(email);
        },
        async "db:countCommentLikesByUser"(email: string) {
          return await countCommentLikesByUser(email);
        },
        async "db:countLikesForComment"(commentId: string) {
          return await countLikesForComment(commentId);
        },
        async "db:countCommentReportsByUser"(email: string) {
          return await countCommentReportsByUser(email);
        },
        async "db:countReportsForComment"(commentId: string) {
          return await countReportsForComment(commentId);
        },
        async "db:countHiddenCommentsByUsername"(username: string) {
          return await countHiddenCommentsByUsername(username);
        },
        async "db:countAnswersByUser"(email: string) {
          return await countAnswersByUser(email);
        },
        async "db:countAnswersForDiscussion"(discussionId: string) {
          return await countAnswersForDiscussion(discussionId);
        },
        async "db:getUserBadges"(email: string) {
          return await getUserBadges(email);
        },
      });
    },
  },
});
