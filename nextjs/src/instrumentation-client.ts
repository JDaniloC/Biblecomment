/**
 * Sentry init for the browser bundle.
 *
 * Companion to `src/instrumentation.ts` (which handles the Node + Edge
 * runtimes). Together they cover all three environments where the app's
 * code can run.
 *
 * Disabled by default in dev — set `SENTRY_DSN` (server) and
 * `NEXT_PUBLIC_SENTRY_DSN` (browser) to opt in. Browser DSN must be
 * `NEXT_PUBLIC_*` because Next.js inlines only that prefix into client
 * bundles; without the prefix the value is undefined at runtime.
 */
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    // Sample only 10% of transactions in prod to keep quota usage low.
    // Errors are always captured regardless.
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,
    // No session replay — Sentry's replay SDK adds ~70KB to the bundle and
    // we don't pay for replay quota. Flip on later if needed.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  });
}

// Required by Sentry App Router instrumentation to capture client-side
// navigation transactions. Safe to export even when DSN is unset — Sentry
// no-ops if init() didn't run.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
