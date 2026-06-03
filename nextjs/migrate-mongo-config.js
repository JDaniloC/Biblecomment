// The migrate-mongo CLI (unlike `next`) does NOT auto-load .env files, so
// MONGODB_URI would be unset here and we'd fall back to localhost even when
// nextjs/.env points at the real database. Load the same env files Next loads
// (via @next/env, which ships with next) before reading MONGODB_URI.
const { loadEnvConfig } = require("@next/env");
loadEnvConfig(process.cwd());

const config = {
  mongodb: {
    url: process.env.MONGODB_URI || "mongodb://localhost:27017/bible-comment",
    databaseName: "bible-comment",
    options: {},
  },
  migrationsDir: "migrations",
  changelogCollectionName: "changelog",
  migrationFileExtension: ".js",
  useFileHash: false,
  moduleSystem: "commonjs",
};

module.exports = config;
