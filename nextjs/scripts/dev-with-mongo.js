/**
 * One-shot dev orchestrator that mirrors cy-test.js but stops short of
 * Cypress: in-memory Mongo + seeded fixtures + `next dev`. Useful when
 * you want a real, browseable app for manual testing or, in this case,
 * a chrome-devtools MCP attaching to an actual session.
 *
 *   npm run dev:mongo
 *
 * Seeds three users (alice/bob/mod), Gênesis with chapter count = 50,
 * and Gn 1:1-3. Same fixture data as the Cypress suite, so anything
 * the spec exercises also exists here.
 *
 * On SIGINT/SIGTERM stops next dev and tears Mongo memory down.
 *
 * No docker, no setup. The Mongo binary downloads on first run
 * (~80 MB, cached under %LOCALAPPDATA%\.cache\mongodb-binaries on
 * Windows or ~/.cache/mongodb-binaries elsewhere).
 */

const path = require("path");
const { spawn } = require("child_process");
const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { assertLocalMongoUri } = require("./safety");

if (process.env.MONGODB_URI) {
  try {
    assertLocalMongoUri(process.env.MONGODB_URI, "dev-with-mongo pre-flight");
  } catch (err) {
    console.error(`[dev] aborting: ${err.message}`);
    process.exit(1);
  }
  console.warn(
    "[dev] note: MONGODB_URI was already set in env — that value will be overridden by the in-memory server.",
  );
}

const FIXTURES = {
  users: [
    { email: "alice@cypress.test", username: "alice", password: "alice-secret-123", moderator: false },
    { email: "bob@cypress.test",   username: "bob",   password: "bob-secret-123",   moderator: false },
    { email: "mod@cypress.test",   username: "mod",   password: "mod-secret-123",   moderator: true  },
  ],
  book: {
    abbrev: "gn",
    name: "Gênesis",
    chapters: 50,
    testament: "VT",
    group: "Pentateuco",
    author: "Moisés",
  },
  verses: [
    { abbrev: "gn", chapter: 1, verseNumber: 1, text: "No princípio, Deus criou os céus e a terra.",                                  reference: "Gn 1:1" },
    { abbrev: "gn", chapter: 1, verseNumber: 2, text: "A terra era sem forma e vazia; havia trevas sobre a face do abismo.",          reference: "Gn 1:2" },
    { abbrev: "gn", chapter: 1, verseNumber: 3, text: "Disse Deus: Haja luz; e houve luz.",                                            reference: "Gn 1:3" },
  ],
};

const COLLECTIONS = ["users", "books", "verses", "comments", "discussions", "notifications"];

async function seed(uri) {
  mongoose.set("strictQuery", false);
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (!db) throw new Error("Mongoose has no db handle.");

  for (const name of COLLECTIONS) {
    try { await db.collection(name).deleteMany({}); } catch { /* collection may not exist yet */ }
  }

  const userDocs = await Promise.all(
    FIXTURES.users.map(async (u) => ({
      email: u.email.toLowerCase().trim(),
      username: u.username,
      password: await bcrypt.hash(u.password, 12),
      passwordType: "bcrypt",
      state: "",
      belief: "",
      moderator: u.moderator,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
  );
  await db.collection("users").insertMany(userDocs);

  await db.collection("books").insertOne(FIXTURES.book);
  await db.collection("verses").insertMany(FIXTURES.verses);

  console.log(
    `[dev] seeded ${FIXTURES.users.length} users (alice/bob/mod), 1 book (gn), ${FIXTURES.verses.length} verses`,
  );
  await mongoose.disconnect();
}

async function main() {
  console.log("[dev] starting mongodb-memory-server...");
  const mongo = await MongoMemoryServer.create({
    instance: { dbName: "biblecomment-dev" },
  });
  const uri = mongo.getUri();
  // Sanity-check the in-memory URI is local. Defends against any future
  // mongodb-memory-server change that might emit a non-localhost address.
  assertLocalMongoUri(uri, "dev-with-mongo in-memory mongo");
  console.log(`[dev] mongo ready at ${uri}`);

  await seed(uri);

  const env = {
    ...process.env,
    MONGODB_URI: uri,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || "dev-mongo-secret-not-for-prod",
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || "http://localhost:5000",
    AUTH_TRUST_HOST: "true",
    NODE_ENV: "development",
  };

  console.log("[dev] launching next dev on :5000 — log in as alice@cypress.test / alice-secret-123\n");

  // Windows requires shell:true for .cmd shims like npm.cmd; harmless on
  // POSIX where /usr/bin/npm is a regular executable.
  const child = spawn("npm", ["run", "dev"], {
    stdio: "inherit",
    env,
    cwd: path.resolve(__dirname, ".."),
    shell: true,
  });

  let teardownStarted = false;
  const teardown = async (signal) => {
    if (teardownStarted) return;
    teardownStarted = true;
    console.log(`\n[dev] received ${signal ?? "exit"}, tearing down...`);
    if (!child.killed) {
      try { child.kill("SIGTERM"); } catch { /* ignore */ }
    }
    try { await mongo.stop(); } catch { /* ignore */ }
    process.exit(0);
  };

  process.on("SIGINT", () => teardown("SIGINT"));
  process.on("SIGTERM", () => teardown("SIGTERM"));
  child.on("exit", () => teardown("child-exit"));
}

main().catch(async (err) => {
  console.error("[dev] fatal:", err && err.message ? err.message : err);
  process.exit(1);
});
