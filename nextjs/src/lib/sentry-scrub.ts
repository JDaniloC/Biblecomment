import type { Event } from "@sentry/nextjs";

/**
 * Strip query strings and fragments from every URL a Sentry event carries.
 *
 * Password-reset and e-mail-verification links hold one-time tokens in the
 * query string, and search pages hold what the user typed; Sentry's default
 * integrations copy the full URL into the request, navigation/fetch
 * breadcrumbs and performance spans. The path alone is enough to debug.
 */
export function stripQuery(url: string): string {
  const i = url.search(/[?#]/);
  return i === -1 ? url : url.slice(0, i);
}

const URL_KEYS = ["url", "from", "to", "url.full", "http.url", "http.target"];

function scrubData(data: Record<string, unknown> | undefined): void {
  if (!data) return;
  for (const key of URL_KEYS) {
    const value = data[key];
    if (typeof value === "string") data[key] = stripQuery(value);
  }
  delete data["url.query"];
  delete data["http.query"];
}

export function scrubEvent<T extends Event>(event: T): T {
  if (event.request) {
    if (event.request.url) event.request.url = stripQuery(event.request.url);
    delete event.request.query_string;
  }
  for (const crumb of event.breadcrumbs ?? []) scrubData(crumb.data);
  for (const span of event.spans ?? []) scrubData(span.data);
  scrubData(event.contexts?.trace?.data);
  return event;
}
