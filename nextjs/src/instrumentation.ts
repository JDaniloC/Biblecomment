import * as Sentry from "@sentry/nextjs";
import { scrubEvent } from "@/lib/sentry-scrub";

export async function register() {
  if (!process.env.SENTRY_DSN) return;

  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,
      // Reset and verify links carry one-time tokens in the query string.
      beforeSend: scrubEvent,
      beforeSendTransaction: scrubEvent,
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,
      // Reset and verify links carry one-time tokens in the query string.
      beforeSend: scrubEvent,
      beforeSendTransaction: scrubEvent,
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
