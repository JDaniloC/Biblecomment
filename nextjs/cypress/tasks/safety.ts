/**
 * Production-safety guard for any code path Cypress can reach.
 *
 * History (2026-04-29): a Cypress run that read MONGODB_URI from the
 * shell ended up wiping a production database via cy.task("db:reset").
 * Never again. Every DB connection inside Cypress (tasks, fixtures,
 * setup hooks) must pass through assertLocalMongoUri() and refuse to
 * proceed if the URI points anywhere but the local machine.
 *
 * "Local" means:
 *   - mongodb:// scheme (mongodb+srv:// is Atlas/cloud and is always rejected)
 *   - every host in the connection string is 127.0.0.1 / ::1 / localhost
 *   - mongodb-memory-server URIs satisfy this naturally (127.0.0.1:<random>)
 *
 * This is intentionally NOT configurable. If you have a real reason to
 * point Cypress at a non-local Mongo, change the code with a comment
 * explaining why — making it env-overridable would defeat the entire
 * point of the guard.
 */

const LOCAL_HOSTS = new Set([
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "localhost",
]);

function extractHosts(uri: string): string[] {
  // mongodb+srv://[user:pass@]host/[db]?... or mongodb://[user:pass@]host[:port][,host...]/...
  const schemeStripped = uri.replace(/^mongodb(\+srv)?:\/\//i, "");
  // Drop credentials if present (everything up to the LAST @ before the host segment).
  const credsStripped = schemeStripped.includes("@")
    ? schemeStripped.slice(schemeStripped.indexOf("@") + 1)
    : schemeStripped;
  // Hosts segment ends at the first / or ?
  const hostsSegment = credsStripped.split(/[/?]/, 1)[0] ?? "";
  // Replica-set URIs comma-separate hosts. Each host may be:
  //   - hostname[:port]
  //   - ipv4[:port]
  //   - [ipv6][:port]   (IPv6 addresses contain colons, hence brackets)
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

export function assertLocalMongoUri(uri: string | undefined, context = "Cypress"): void {
  if (!uri) {
    throw new Error(
      `[${context}] MONGODB_URI is not set. Refusing to connect to an unknown DB. ` +
        `Tests must run via 'npm run cy:test' which spins up an in-memory Mongo.`,
    );
  }

  if (/^mongodb\+srv:/i.test(uri)) {
    throw new Error(
      `[${context}] MONGODB_URI uses 'mongodb+srv://' (Atlas / cloud). ` +
        `Refusing to connect — Cypress only talks to a local Mongo. ` +
        `If you accidentally exported a production URI, unset it with ` +
        `'unset MONGODB_URI' (bash) or '$env:MONGODB_URI=$null' (PowerShell) ` +
        `and rerun 'npm run cy:test'.`,
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
        `Cypress will ONLY connect to 127.0.0.1 / ::1 / localhost / 0.0.0.0. ` +
        `If a production URI was inherited from .env or your shell, unset it ` +
        `before running tests.`,
    );
  }
}
