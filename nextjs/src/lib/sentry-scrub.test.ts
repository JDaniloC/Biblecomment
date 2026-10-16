import { describe, it, expect } from "vitest";
import type { Event } from "@sentry/nextjs";
import { scrubEvent, stripQuery } from "./sentry-scrub";

describe("stripQuery", () => {
  it("drops the query string and fragment, keeping the path", () => {
    expect(stripQuery("https://x.test/reset-password?token=abc")).toBe("https://x.test/reset-password");
    expect(stripQuery("/search?q=amor#r")).toBe("/search");
    expect(stripQuery("/verses/gn/1")).toBe("/verses/gn/1");
  });
});

describe("scrubEvent", () => {
  it("removes tokens from the request, breadcrumbs and performance spans", () => {
    const event = {
      request: {
        url: "https://biblecomment.com.br/verify-email?token=secret-1",
        query_string: "token=secret-1",
      },
      breadcrumbs: [
        { category: "navigation", data: { from: "/login", to: "/reset-password?token=secret-2" } },
        { category: "fetch", data: { url: "/api/x?token=secret-3", method: "GET" } },
      ],
      spans: [
        {
          span_id: "1",
          trace_id: "t",
          start_timestamp: 0,
          data: { "url.full": "https://biblecomment.com.br/reset-password?token=secret-4", "url.query": "?token=secret-4" },
        },
      ],
      contexts: {
        trace: {
          span_id: "1",
          trace_id: "t",
          data: { "http.url": "https://biblecomment.com.br/verify-email?token=secret-5" },
        },
      },
    } as unknown as Event;

    const scrubbed = scrubEvent(event);

    expect(JSON.stringify(scrubbed)).not.toMatch(/secret-\d/);
    expect(scrubbed.request?.url).toBe("https://biblecomment.com.br/verify-email");
    expect(scrubbed.breadcrumbs?.[0].data?.to).toBe("/reset-password");
    expect(scrubbed.breadcrumbs?.[1].data?.method).toBe("GET");
  });

  it("leaves events without URLs alone", () => {
    const event = { message: "boom" } as Event;
    expect(scrubEvent(event)).toEqual({ message: "boom" });
  });
});
