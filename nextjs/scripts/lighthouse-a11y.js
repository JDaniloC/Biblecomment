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
 *   3. Seed a minimum dataset (alice + Genesis + a few verses) so the
 *      auth-gated routes have something to render.
 *   4. Programmatically log in via /api/auth/callback/credentials to
 *      obtain a session cookie. Lighthouse picks it up via
 *      `--extra-headers` so it audits each authed route as `alice`.
 *   5. For each route, drive the lighthouse CLI directly (not via lhci
 *      autorun) so we can tolerate Windows' chrome-launcher
 *      EPERM-on-tmp-cleanup quirk: the audit JSON is written BEFORE the
 *      cleanup throws, so we ignore the exit code and read the report
 *      file. lhci's strict error propagation is why we bypass it.
 *   6. Tear server + mongo down on exit. Exit code 0 if every score
 *      meets the threshold, 1 otherwise (with which URLs failed).
 *
 * Reports land in .lighthouseci/lh-<route>.json for inspection.
 */

const path = require("path");
const fs = require("fs");
const { spawn, spawnSync } = require("child_process");
const http = require("http");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { assertLocalMongoUri } = require("./safety");

const PORT = parseInt(process.env.A11Y_PORT || "3001", 10);
const THRESHOLD = parseFloat(process.env.A11Y_THRESHOLD || "0.95");
const BASE_URL = `http://127.0.0.1:${PORT}`;
const IS_WIN = process.platform === "win32";

// auth: true → lighthouse runs with the session cookie attached so the
// route renders as alice. /chapter/gn/1 redirects to /verses/gn/1, so we
// audit /verses/gn/1 directly (lighthouse follows the redirect anyway,
// but auditing the canonical URL avoids any redirect-time noise).
const ROUTES = [
  { path: "/", auth: false },
  { path: "/login", auth: false },
  { path: "/register", auth: false },
  { path: "/privacy", auth: false },
  { path: "/terms", auth: false },
  { path: "/home", auth: true },
  { path: "/profile", auth: true },
  { path: "/discussions", auth: true },
  { path: "/users", auth: true },
  { path: "/verses/gn/1", auth: true },
];

// Seed user. The bcrypt hash is generated at seed time. tutorialsCompleted
// is pre-marked so the chapter audit doesn't open the onboarding tour
// (which would inflate DOM size and possibly mask real a11y regressions).
const SEED_USER = {
  email: "alice@a11y.local",
  username: "alice",
  password: "alice-a11y-pw",
};

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

async function seedDatabase(uri) {
  const conn = await mongoose.createConnection(uri).asPromise();
  try {
    const db = conn.db;
    const fixturesDir = path.resolve(__dirname, "..", "cypress", "fixtures");
    const bookFixture = JSON.parse(
      fs.readFileSync(path.join(fixturesDir, "book-gn.json"), "utf8"),
    );

    const passwordHash = await bcrypt.hash(SEED_USER.password, 12);
    await db.collection("users").insertOne({
      email: SEED_USER.email.toLowerCase(),
      username: SEED_USER.username,
      password: passwordHash,
      state: "",
      belief: "",
      moderator: false,
      // Pre-mark so the chapter onboarding tour doesn't auto-open during
      // the audit — it would change the DOM mid-run and risk false flags.
      tutorialsCompleted: ["chapter-v1"],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await db.collection("books").insertOne(bookFixture.book);
    if (Array.isArray(bookFixture.verses) && bookFixture.verses.length > 0) {
      await db.collection("verses").insertMany(bookFixture.verses);
    }
  } finally {
    await conn.close();
  }
}

/**
 * Drive the credentials flow ourselves so lighthouse can audit routes as
 * a logged-in user without us having to spin up Playwright. Returns a
 * single Cookie header value (e.g. "authjs.session-token=eyJ...") that
 * lighthouse will replay on every request via --extra-headers.
 */
async function loginAndGetCookieHeader(baseUrl) {
  // 1) GET /api/auth/csrf — yields a csrfToken AND sets a CSRF cookie that
  //    must accompany the credentials POST. Without that cookie the POST
  //    is rejected as a forgery.
  const csrfRes = await fetch(`${baseUrl}/api/auth/csrf`);
  if (!csrfRes.ok) {
    throw new Error(`GET /api/auth/csrf failed: ${csrfRes.status}`);
  }
  const csrfBody = await csrfRes.json();
  const csrfToken = csrfBody.csrfToken;
  if (!csrfToken) throw new Error("csrfToken missing from /api/auth/csrf");
  const csrfCookies = collectSetCookieHeaders(csrfRes);
  const csrfCookieValue = csrfCookies
    .map((c) => c.split(";", 1)[0])
    .filter((c) => /csrf-token/i.test(c))
    .join("; ");

  // 2) POST credentials with the CSRF cookie attached. The response sets
  //    the session-token cookie that subsequent requests use.
  const body = new URLSearchParams({
    email: SEED_USER.email,
    password: SEED_USER.password,
    csrfToken,
    callbackUrl: "/home",
    json: "true",
  });
  const loginRes = await fetch(`${baseUrl}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: csrfCookieValue,
    },
    body: body.toString(),
    redirect: "manual",
  });
  if (loginRes.status !== 200 && loginRes.status !== 302) {
    throw new Error(`POST credentials failed: ${loginRes.status}`);
  }
  const loginCookies = collectSetCookieHeaders(loginRes);
  const sessionCookie = loginCookies
    .map((c) => c.split(";", 1)[0])
    .find((c) => /session-token/i.test(c));
  if (!sessionCookie) {
    throw new Error(
      `Login succeeded (status ${loginRes.status}) but no session-token cookie was set. Headers: ${JSON.stringify(loginCookies)}`,
    );
  }
  return sessionCookie;
}

function collectSetCookieHeaders(res) {
  // Headers#getSetCookie was added in Node 18.14 / undici 5.18.
  if (typeof res.headers.getSetCookie === "function") {
    return res.headers.getSetCookie();
  }
  const single = res.headers.get("set-cookie");
  return single ? [single] : [];
}

async function main() {
  console.log("[a11y] starting in-memory Mongo...");
  const mongo = await MongoMemoryServer.create({
    instance: { dbName: "biblecomment-a11y" },
  });
  const uri = mongo.getUri();
  assertLocalMongoUri(uri, "a11y in-memory mongo");
  console.log(`[a11y] mongo ready at ${uri}`);

  console.log("[a11y] seeding alice + Genesis + verses...");
  await seedDatabase(uri);

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
  const authHeadersPath = path.join(reportsDir, "auth-headers.json");

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
    console.log(`[a11y] server ready at ${BASE_URL}; logging in to mint session cookie...`);

    let authHeadersArg = null;
    if (ROUTES.some((r) => r.auth)) {
      const cookieHeader = await loginAndGetCookieHeader(BASE_URL);
      // Persist as JSON file so we don't have to escape JSON for shell.
      fs.writeFileSync(
        authHeadersPath,
        JSON.stringify({ Cookie: cookieHeader }, null, 2),
      );
      authHeadersArg = `--extra-headers=${authHeadersPath}`;
      console.log("[a11y] auth-headers ready (cookie persisted to file)");
    }

    console.log("[a11y] running lighthouse per route...");

    const scores = [];
    for (const route of ROUTES) {
      const url = `${BASE_URL}${route.path}`;
      const reportPath = path.join(reportsDir, `lh-${safeName(route.path)}.json`);
      // Remove stale report so a missing file means a real failure.
      try { fs.unlinkSync(reportPath); } catch { /* not present */ }

      const tag = route.auth ? "(authed)" : "(public)";
      console.log(`[a11y] auditing ${tag} ${url} -> ${path.relative(cwd, reportPath)}`);
      const args = [
        "lighthouse",
        url,
        "--output=json",
        "--output-path", reportPath,
        "--only-categories=accessibility",
        "--quiet",
        "--chrome-flags=--no-sandbox --disable-dev-shm-usage --headless=new",
        "--preset=desktop",
      ];
      if (route.auth && authHeadersArg) {
        args.push(authHeadersArg);
        // Disable storage reset so the session-token cookie isn't wiped
        // between Chrome's prep steps. We're already running in a fresh
        // Chrome profile for each lighthouse invocation.
        args.push("--disable-storage-reset");
      }
      // Ignore exit code: chrome-launcher's tmp-dir cleanup throws EPERM
      // on Windows AFTER the report JSON has been written. The JSON is
      // what we care about; exit code 1 in that scenario is a false
      // negative.
      await spawnIgnoreExit("npx", args, { stdio: "inherit", env, cwd, shell: IS_WIN });

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
