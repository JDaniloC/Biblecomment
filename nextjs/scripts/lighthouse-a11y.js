/**
 * Lighthouse a11y orchestrator.
 *
 *   npm run a11y                    # default: port 3001, threshold 0.95
 *   A11Y_PORT=3005 npm run a11y     # override port if 3001 is in use
 *   A11Y_THRESHOLD=0.9 npm run a11y # lower the bar (still warns)
 *
 * Pipeline:
 *   1. Spin up an in-process Mongo (mongodb-memory-server) with the
 *      same local-only safety guard the Cypress orchestrator uses.
 *   2. Build the app (next build) and start it on the chosen port,
 *      kept distinct from dev (3000) and Cypress (5050) so the script
 *      can run alongside an open dev server.
 *   3. For each public route, drive the lighthouse CLI directly (not
 *      via lhci autorun) so we can tolerate Windows' chrome-launcher
 *      EPERM-on-tmp-cleanup quirk: the audit JSON is written BEFORE the
 *      cleanup throws, so we ignore the exit code and read the report
 *      file. lhci's strict error propagation is why we bypass it.
 *   4. Tear server + mongo down on exit. Exit code 0 if every score
 *      meets the threshold, 1 otherwise (with which URLs failed).
 *
 * Reports land in .lighthouseci/lh-<route>.json for inspection.
 */

const path = require("path");
const fs = require("fs");
const { spawn, spawnSync } = require("child_process");
const http = require("http");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { assertLocalMongoUri } = require("./safety");

const PORT = parseInt(process.env.A11Y_PORT || "3001", 10);
const THRESHOLD = parseFloat(process.env.A11Y_THRESHOLD || "0.95");
const BASE_URL = `http://127.0.0.1:${PORT}`;
const IS_WIN = process.platform === "win32";

const ROUTES = ["/", "/login", "/register", "/privacy", "/terms"];

if (process.env.MONGODB_URI) {
  try {
    assertLocalMongoUri(process.env.MONGODB_URI, "a11y pre-flight");
  } catch (err) {
    console.error(`[a11y] aborting: ${err.message}`);
    process.exit(1);
  }
  console.warn(
    "[a11y] note: MONGODB_URI was already set in env — that value will be overridden by the in-memory server.",
  );
}

function waitForServer(url, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(url, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) return resolve();
        retry();
      });
      req.on("error", retry);
      req.setTimeout(2_000, () => {
        req.destroy();
        retry();
      });
    };
    const retry = () => {
      if (Date.now() > deadline) {
        return reject(new Error(`Server at ${url} never became reachable.`));
      }
      setTimeout(tick, 500);
    };
    tick();
  });
}

function spawnPromise(cmd, args, opts) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, opts);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(" ")} exited with ${code}`));
    });
  });
}

function spawnIgnoreExit(cmd, args, opts) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, opts);
    child.on("exit", () => resolve());
  });
}

function killProcessTree(pid) {
  if (!pid) return;
  if (IS_WIN) {
    spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    try { process.kill(-pid, "SIGTERM"); } catch { /* ignore */ }
    try { process.kill(pid, "SIGTERM"); } catch { /* ignore */ }
  }
}

function safeName(route) {
  return route.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "root";
}

async function main() {
  console.log("[a11y] starting in-memory Mongo...");
  const mongo = await MongoMemoryServer.create({
    instance: { dbName: "biblecomment-a11y" },
  });
  const uri = mongo.getUri();
  assertLocalMongoUri(uri, "a11y in-memory mongo");
  console.log(`[a11y] mongo ready at ${uri}`);

  const env = {
    ...process.env,
    MONGODB_URI: uri,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || "a11y-test-secret-not-for-prod",
    NEXTAUTH_URL: BASE_URL,
    AUTH_TRUST_HOST: "true",
    NODE_ENV: "production",
  };

  const cwd = path.resolve(__dirname, "..");
  const reportsDir = path.join(cwd, ".lighthouseci");
  fs.mkdirSync(reportsDir, { recursive: true });

  let server;
  let exitCode = 0;
  try {
    console.log("[a11y] building (one-time)...");
    await spawnPromise("npm", ["run", "build"], {
      stdio: "inherit",
      env,
      cwd,
      shell: IS_WIN,
    });

    console.log(`[a11y] starting next on :${PORT}...`);
    const nextBin = require.resolve("next/dist/bin/next");
    server = spawn(process.execPath, [nextBin, "start", "-p", String(PORT)], {
      stdio: "inherit",
      env,
      cwd,
    });

    await waitForServer(BASE_URL);
    console.log(`[a11y] server ready at ${BASE_URL}; running lighthouse per route...`);

    const scores = [];
    for (const route of ROUTES) {
      const url = `${BASE_URL}${route}`;
      const reportPath = path.join(reportsDir, `lh-${safeName(route)}.json`);
      // Remove stale report so a missing file means a real failure.
      try { fs.unlinkSync(reportPath); } catch { /* not present */ }

      console.log(`[a11y] auditing ${url} -> ${path.relative(cwd, reportPath)}`);
      // Ignore exit code: chrome-launcher's tmp-dir cleanup throws EPERM
      // on Windows AFTER the report JSON has been written. The JSON is
      // what we care about; exit code 1 in that scenario is a false
      // negative.
      await spawnIgnoreExit(
        "npx",
        [
          "lighthouse",
          url,
          "--output=json",
          "--output-path", reportPath,
          "--only-categories=accessibility",
          "--quiet",
          "--chrome-flags=--no-sandbox --disable-dev-shm-usage --headless=new",
          "--preset=desktop",
        ],
        { stdio: "inherit", env, cwd, shell: IS_WIN },
      );

      if (!fs.existsSync(reportPath)) {
        console.error(`[a11y] no report produced for ${url}`);
        scores.push({ url, score: 0, missing: true });
        continue;
      }
      const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
      const score = report?.categories?.accessibility?.score ?? 0;
      scores.push({ url, score });
      console.log(`[a11y]   accessibility: ${(score * 100).toFixed(0)}/100`);
    }

    console.log("\n[a11y] summary:");
    for (const s of scores) {
      const pct = (s.score * 100).toFixed(0);
      const mark = s.score >= THRESHOLD ? "✓" : "✗";
      console.log(`  ${mark} ${pct}/100  ${s.url}${s.missing ? "  (no report)" : ""}`);
    }
    const failures = scores.filter((s) => s.score < THRESHOLD);
    if (failures.length > 0) {
      console.error(
        `\n[a11y] ${failures.length}/${scores.length} URL(s) below threshold ${(THRESHOLD * 100).toFixed(0)}%`,
      );
      exitCode = 1;
    } else {
      console.log(
        `\n[a11y] all ${scores.length} URLs at or above threshold ${(THRESHOLD * 100).toFixed(0)}%`,
      );
    }
  } catch (err) {
    console.error(`[a11y] failed: ${err.message}`);
    exitCode = 1;
  } finally {
    if (server && !server.killed && server.pid) {
      killProcessTree(server.pid);
    }
    console.log("[a11y] tearing down mongo...");
    try {
      await mongo.stop();
    } catch {
      /* ignore */
    }
  }
  process.exit(exitCode);
}

main().catch(async (err) => {
  console.error("[a11y] fatal:", err && err.message ? err.message : err);
  process.exit(1);
});
