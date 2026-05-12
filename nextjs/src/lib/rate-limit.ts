/**
 * Tiny in-memory token bucket. Designed for low-volume sensitive endpoints
 * (password reset, magic link) where each Next.js node sees a small slice of
 * traffic and a per-process counter is enough.
 *
 * For multi-region / autoscaled deployments swap the impl with a Redis-backed
 * one; the interface stays the same.
 */

export interface RateLimitOpts {
  windowMs: number;
  max: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export function checkRateLimit(key: string, opts: RateLimitOpts): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    const bucket: Bucket = { count: 1, resetAt: now + opts.windowMs };
    buckets.set(key, bucket);
    return { allowed: true, remaining: opts.max - 1, resetAt: bucket.resetAt };
  }

  if (existing.count >= opts.max) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: opts.max - existing.count,
    resetAt: existing.resetAt,
  };
}

/** Test helper. */
export function _resetRateLimitBuckets(): void {
  buckets.clear();
}
