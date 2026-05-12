import { describe, it, expect } from "vitest";
import { z } from "zod";
import { parseBody } from "./parse-body";

const schema = z.object({ name: z.string().min(1) });

function makeRequest(body: unknown, opts: { invalidJson?: boolean } = {}): Request {
  const init: RequestInit = {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: opts.invalidJson ? "{not json" : JSON.stringify(body),
  };
  return new Request("http://localhost/test", init);
}

describe("parseBody", () => {
  it("returns parsed data on success", async () => {
    const result = await parseBody(makeRequest({ name: "alice" }), schema);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.name).toBe("alice");
  });

  it("returns 400 with 'Invalid JSON' for malformed JSON", async () => {
    const result = await parseBody(makeRequest({}, { invalidJson: true }), schema);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
      const body = await result.response.json();
      expect(body.error).toBe("Invalid JSON");
    }
  });

  it("returns 400 with validation issues when schema fails", async () => {
    const result = await parseBody(makeRequest({ name: "" }), schema);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
      const body = await result.response.json();
      expect(body.error).toBe("Validation failed");
      expect(body.issues).toBeDefined();
    }
  });

  it("returns 400 when body shape is wrong", async () => {
    const result = await parseBody(makeRequest({ unrelated: 1 }), schema);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
    }
  });
});
