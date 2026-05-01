import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { checkRateLimit, _resetRateLimitBuckets } from "./rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    _resetRateLimitBuckets();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-01T00:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("allows up to `max` requests per window, then blocks", () => {
    const opts = { windowMs: 60_000, max: 3 };
    expect(checkRateLimit("ip:1", opts).allowed).toBe(true);
    expect(checkRateLimit("ip:1", opts).allowed).toBe(true);
    expect(checkRateLimit("ip:1", opts).allowed).toBe(true);

    const blocked = checkRateLimit("ip:1", opts);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("isolates buckets by key", () => {
    const opts = { windowMs: 60_000, max: 1 };
    expect(checkRateLimit("ip:a", opts).allowed).toBe(true);
    expect(checkRateLimit("ip:a", opts).allowed).toBe(false);
    expect(checkRateLimit("ip:b", opts).allowed).toBe(true);
  });

  it("rolls the window over after resetAt", () => {
    const opts = { windowMs: 60_000, max: 1 };
    expect(checkRateLimit("ip:1", opts).allowed).toBe(true);
    expect(checkRateLimit("ip:1", opts).allowed).toBe(false);

    vi.advanceTimersByTime(60_000 + 1);
    expect(checkRateLimit("ip:1", opts).allowed).toBe(true);
  });

  it("returns accurate remaining for partial windows", () => {
    const opts = { windowMs: 60_000, max: 5 };
    expect(checkRateLimit("ip:1", opts).remaining).toBe(4);
    expect(checkRateLimit("ip:1", opts).remaining).toBe(3);
    expect(checkRateLimit("ip:1", opts).remaining).toBe(2);
  });
});
