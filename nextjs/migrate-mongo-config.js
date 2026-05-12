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
