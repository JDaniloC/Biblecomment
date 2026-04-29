/**
 * One-shot Cypress runner.
 *
 *   npm run cy:test          # build + start prod server + cypress run (CI-ish)
 *   npm run cy:test:dev      # next dev + cypress open (interactive)
 *
 * Pipeline:
 *   1. Spin up an in-process Mongo (mongodb-memory-server).
 *   2. Export MONGODB_URI / NEXTAUTH_SECRET / NEXTAUTH_URL.
 *   3. Run start-server-and-test with the requested mode.
 *   4. Tear Mongo down on exit (success or failure).
 *
 * No docker required. The Mongo binary is downloaded the first time
 * mongodb-memory-server runs on this machine (~80MB cached under
 * %LOCALAPPDATA%\.cache\mongodb-binaries).
 */

const { MongoMemoryServer } = require("mongodb-memory-server");
const { spawn } = require("child_process");
const path = require("path");
const { assertLocalMongoUri } = require("./safety");

const MODE = process.argv[2] === "dev" ? "dev" : "ci";

// Belt-and-suspenders: if MONGODB_URI is already set in the parent shell
// (e.g. inherited from .env or an explicit export), refuse to start when
// it points at a non-local host. The orchestrator does override it for
// the spawned processes, but a misconfigured environment is loud enough
// that we'd rather abort than proceed silently.
if (process.env.MONGODB_URI) {
  try {
    assertLocalMongoUri(process.env.MONGODB_URI, "cy-test pre-flight");
  } catch (err) {
    console.error(`[cy-test] aborting: ${err.message}`);
    process.exit(1);
  }
  console.warn(
    "[cy-test] note: MONGODB_URI was already set in env — that value will be overridden by the in-memory server.",
  );
}

// Use a port distinct from `npm run dev` (3000) so a developer can keep
// their dev server running while Cypress executes against an isolated
// build. Override with CYPRESS_PORT if needed.
const PORT = parseInt(process.env.CYPRESS_PORT || "5050", 10);
const BASE_URL = `http://localhost:${PORT}`;

async function main() {
  console.log("[cy-test] starting in-memory Mongo...");
  const mongo = await MongoMemoryServer.create({
    instance: { dbName: "biblecomment-cypress" },
  });
  const uri = mongo.getUri();
  // Sanity: mongodb-memory-server always emits a 127.0.0.1 URI, but we
  // re-check so any future change to that library can't bypass the guard.
  assertLocalMongoUri(uri, "cy-test in-memory mongo");
  console.log(`[cy-test] mongo ready at ${uri}`);

  const env = {
    ...process.env,
    MONGODB_URI: uri,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || "cypress-test-secret-not-for-prod",
    NEXTAUTH_URL: BASE_URL,
    // Auth.js v5 refuses requests to non-allowlisted hosts in production
    // mode (next start). localhost isn't auto-trusted — without this,
    // /api/auth/session throws UntrustedHost. Test-time only; real
    // deploys don't pass through this script.
    AUTH_TRUST_HOST: "true",
    // Pass-through so Cypress' baseUrl can read it via env.
    CYPRESS_BASE_URL: BASE_URL,
    NODE_ENV: MODE === "dev" ? "development" : "production",
  };

  const sst = require.resolve("start-server-and-test/src/bin/start.js");
  // Invoke next directly with our chosen port instead of routing through
  // `npm run dev` / `npm run start` (which hardcode 3000 for the human
  // dev workflow). Using `npx next ...` keeps node-modules resolution
  // identical to the project-installed binary.
  const startCmd =
    MODE === "dev"
      ? `npx next dev -p ${PORT}`
      : `npx next start -p ${PORT}`;
  const testCmd = MODE === "dev" ? "cy:open" : "cy:run";
  const args = [startCmd, BASE_URL, testCmd];

  if (MODE === "ci") {
    console.log("[cy-test] running next build (one-time)...");
    await runOnce("npm", ["run", "build"], env);
  }

  console.log(`[cy-test] launching start-server-and-test (${MODE}) on port ${PORT}...`);
  const child = spawn(process.execPath, [sst, ...args], {
    stdio: "inherit",
    env,
    cwd: path.resolve(__dirname, ".."),
  });

  let exitCode = 0;
  await new Promise((resolve) => {
    child.on("exit", (code) => {
      exitCode = code ?? 0;
      resolve();
    });
  });

  console.log("[cy-test] tearing down mongo...");
  await mongo.stop();
  process.exit(exitCode);
}

function runOnce(cmd, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit", env, shell: process.platform === "win32" });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(" ")} exited with ${code}`));
    });
  });
}

main().catch(async (err) => {
  console.error("[cy-test] fatal:", err.message || err);
  process.exit(1);
});
