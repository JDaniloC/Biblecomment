/**
 * Production-safety guard for orchestrator scripts (cy-test.js,
 * dev-with-mongo.js, anything that spawns next.js with a custom env).
 *
 * Mirrors cypress/tasks/safety.ts but in plain Node so the orchestrator
 * doesn't need ts-node.
 *
 * History (2026-04-29): Cypress accidentally connected to a production
 * Mongo and cy.task("db:reset") emptied real collections. Every script
 * that handles MONGODB_URI must call assertLocalMongoUri() before doing
 * anything destructive.
 */

const LOCAL_HOSTS = new Set(["127.0.0.1", "0.0.0.0", "::1", "localhost"]);

function extractHosts(uri) {
  const schemeStripped = uri.replace(/^mongodb(\+srv)?:\/\//i, "");
  const credsStripped = schemeStripped.includes("@")
    ? schemeStripped.slice(schemeStripped.indexOf("@") + 1)
    : schemeStripped;
  const hostsSegment = credsStripped.split(/[/?]/, 1)[0] || "";
  return hostsSegment
    .split(",")
    .map((h) => {
      const trimmed = h.trim();
      const ipv6 = trimmed.match(/^\[([^\]]+)\](?::\d+)?$/);
      if (ipv6) return ipv6[1].toLowerCase();
      return trimmed.split(":")[0].toLowerCase();
    })
    .filter((h) => h.length > 0);
}

function assertLocalMongoUri(uri, context) {
  context = context || "scripts";
  if (!uri) {
    throw new Error(
      `[${context}] MONGODB_URI is not set. Refusing to proceed.`,
    );
  }

  if (/^mongodb\+srv:/i.test(uri)) {
    throw new Error(
      `[${context}] MONGODB_URI uses 'mongodb+srv://' (Atlas / cloud). ` +
        `Refusing — only local Mongo is allowed for tests/dev orchestrators. ` +
        `Unset MONGODB_URI from your shell and rerun.`,
    );
  }

  const hosts = extractHosts(uri);
  if (hosts.length === 0) {
    throw new Error(`[${context}] could not parse a host from MONGODB_URI.`);
  }

  const offenders = hosts.filter((h) => !LOCAL_HOSTS.has(h));
  if (offenders.length > 0) {
    throw new Error(
      `[${context}] MONGODB_URI host '${offenders.join(", ")}' is not local. ` +
        `Only 127.0.0.1 / ::1 / localhost / 0.0.0.0 are allowed. ` +
        `If a production URI was inherited, unset it before running.`,
    );
  }
}

module.exports = { assertLocalMongoUri };
