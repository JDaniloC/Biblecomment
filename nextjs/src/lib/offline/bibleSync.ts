import {
  putBook,
  getMeta,
  setMeta,
  isBookSynced,
  type SyncStatus,
  type BookChapters,
} from "./bibleStore";

type BooksPayload = { books: { abbrev: string; chapters: number }[]; version: string };
type BookVersesPayload = { abbrev: string; chapters: BookChapters };

export type SyncOptions = {
  // The settings toggle. When false, sync is a hard no-op (no fetch, no write).
  enabled: boolean;
  // Progress callback (downloaded count, total). Optional; the UI status line
  // reads meta instead, so this is just for live progress if a caller wants it.
  onProgress?: (done: number, total: number) => void;
};

// Concurrency for per-book downloads. Small on purpose: this runs in the
// background on first launch and must not starve the foreground or trip
// mobile connection limits.
const CONCURRENCY = 3;

// Detect a quota-exceeded failure across browsers (name is the reliable
// signal; older Safari used code 22).
function isQuotaError(err: unknown): boolean {
  return (
    err instanceof DOMException &&
    (err.name === "QuotaExceededError" || err.code === 22)
  );
}

async function writeMeta(version: string, status: SyncStatus): Promise<void> {
  await setMeta({ version, syncedAt: Date.now(), status });
}

/**
 * Download the offline Bible dataset once, resumably. Safe to call on every
 * app start: when the server version matches local meta and all books are
 * present it is a no-op. Never throws — failures are recorded in meta.status
 * (`partial` for network drops) so the next launch can resume. When disabled
 * it is a hard no-op that writes nothing; the profile toggle owns the `off`
 * status.
 */
export async function syncOfflineBible(opts: SyncOptions): Promise<void> {
  if (!opts.enabled) return; // toggle off → do nothing, write nothing.

  let payload: BooksPayload;
  try {
    const res = await fetch("/api/books");
    if (!res.ok) return; // can't determine the version; try again next start.
    payload = (await res.json()) as BooksPayload;
  } catch {
    return; // offline at startup — nothing to sync, leave existing data intact.
  }

  const { books, version } = payload;

  // Fast path: version unchanged AND every book already stored → no-op.
  const meta = await getMeta();
  if (meta && meta.version === version) {
    const allPresent = (
      await Promise.all(books.map((b) => isBookSynced(b.abbrev, version)))
    ).every(Boolean);
    if (allPresent) {
      await writeMeta(version, "ready");
      return;
    }
  }

  await writeMeta(version, "syncing");

  // Only download books not already at this version (resumable / idempotent).
  const pending: string[] = [];
  for (const b of books) {
    if (!(await isBookSynced(b.abbrev, version))) pending.push(b.abbrev);
  }

  let done = books.length - pending.length;
  let hadFailure = false;

  // Fetch + store one book. Returns false on a recoverable failure so the
  // run can be marked partial; throws only to abort the whole sync (quota).
  async function downloadBook(abbrev: string): Promise<boolean> {
    let res: Response;
    try {
      res = await fetch(`/api/books/${abbrev}/verses`);
    } catch {
      return false; // network drop — leave already-stored books in place.
    }
    if (!res.ok) return false;
    const data = (await res.json()) as BookVersesPayload;
    try {
      await putBook(abbrev, { chapters: data.chapters }, version);
    } catch (err) {
      if (isQuotaError(err)) throw err; // abort the run; caller marks partial.
      return false;
    }
    done++;
    opts.onProgress?.(done, books.length);
    return true;
  }

  // Drain `pending` with a bounded pool of workers (CONCURRENCY at a time).
  const queue = [...pending];
  async function worker(): Promise<void> {
    while (queue.length > 0) {
      const abbrev = queue.shift();
      if (abbrev === undefined) return;
      const ok = await downloadBook(abbrev);
      if (!ok) hadFailure = true;
    }
  }

  try {
    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, queue.length) }, () => worker()),
    );
  } catch (err) {
    if (isQuotaError(err)) {
      // Out of storage: stop, keep partial dataset, surface the status.
      await writeMeta(version, "partial");
      return;
    }
    // Any other unexpected throw still must not bubble to the caller.
    await writeMeta(version, "partial");
    return;
  }

  await writeMeta(version, hadFailure ? "partial" : "ready");
}
