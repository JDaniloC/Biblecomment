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

const MODE = process.argv[2] === "dev" ? "dev" : "ci";

async function main() {
  console.log("[cy-test] starting in-memory Mongo...");
  const mongo = await MongoMemoryServer.create({
    instance: { dbName: "biblecomment-cypress" },
  });
  const uri = mongo.getUri();
  console.log(`[cy-test] mongo ready at ${uri}`);

  const env = {
    ...process.env,
    MONGODB_URI: uri,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || "cypress-test-secret-not-for-prod",
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || "http://localhost:5000",
    NODE_ENV: MODE === "dev" ? "development" : "production",
  };

  const sst = require.resolve("start-server-and-test/src/bin/start.js");
  const args =
    MODE === "dev"
      ? ["dev", "http://localhost:5000", "cy:open"]
      : ["start", "http://localhost:5000", "cy:run"];

  if (MODE === "ci") {
    console.log("[cy-test] running next build (one-time)...");
    await runOnce("npm", ["run", "build"], env);
  }

  console.log(`[cy-test] launching start-server-and-test (${MODE})...`);
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
