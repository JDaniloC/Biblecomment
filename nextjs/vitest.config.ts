import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    globals: false,
    include: [
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
      // cypress/tasks/* runs in node (Cypress' Node-side); guard tests
      // live there so safety helpers stay close to their consumers.
      "cypress/tasks/**/*.test.ts",
    ],
  },
});
