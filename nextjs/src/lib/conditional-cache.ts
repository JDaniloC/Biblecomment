import { unstable_cache } from "next/cache";

// Cypress's db:reset hook drops all collections between specs but Next's
// in-process Data Cache survives. Calls keyed by (abbrev, chapter) etc.
// would hand back stale verseIds whose Mongo docs no longer exist, which
// surfaces as cascading "Versículo não encontrado" failures. Bypassing
// the cache in CYPRESS mode keeps reads honest at a negligible cost
// (memory-server is in-process anyway).
const SKIP = process.env.CYPRESS === "1";

export function conditionalCache<F extends (...args: never[]) => Promise<unknown>>(
  fn: F,
  keyParts: string[],
  options: { revalidate: number; tags: string[] },
): F {
  if (SKIP) return fn;
  // unstable_cache narrows its generic in a way that conflicts with our
  // simpler shape; the cast is safe because we hand the same fn back.
  return unstable_cache(fn as never, keyParts, options) as F;
}
