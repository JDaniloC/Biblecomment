// Thin raw-IndexedDB wrapper for the offline Bible dataset. No third-party
// dependency: the surface is five functions over two object stores, so a
// hand-rolled wrapper keeps the bundle lean. All Bible text is public and
// immutable, so nothing here is personalized — safe on shared devices.

const DB_NAME = "biblecomment-offline";
const DB_VERSION = 1;
const BOOKS_STORE = "books";
const META_STORE = "meta";
const META_KEY = "state";

export type ChapterVerse = { n: number; t: string };
export type BookChapters = Record<string, ChapterVerse[]>;
export type StoredBook = { chapters: BookChapters; version: string };

export type SyncStatus = "idle" | "syncing" | "ready" | "partial" | "off";
export type OfflineMeta = {
	version: string;
	syncedAt: number;
	status: SyncStatus;
};

function openDB(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, DB_VERSION);
		req.onupgradeneeded = () => {
			const db = req.result;
			// `books` keyed by abbrev; the stored value is { chapters, version }.
			if (!db.objectStoreNames.contains(BOOKS_STORE)) {
				db.createObjectStore(BOOKS_STORE);
			}
			// `meta` holds a single record under META_KEY.
			if (!db.objectStoreNames.contains(META_STORE)) {
				db.createObjectStore(META_STORE);
			}
		};
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

// Promisify a single get/put against one store. `mode` picks the txn type.
function withStore<T>(
	store: string,
	mode: IDBTransactionMode,
	fn: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
	return openDB().then(
		(db) =>
			new Promise<T>((resolve, reject) => {
				const tx = db.transaction(store, mode);
				const req = fn(tx.objectStore(store));
				req.onsuccess = () => resolve(req.result);
				req.onerror = () => reject(req.error);
				tx.oncomplete = () => db.close();
				tx.onerror = () => reject(tx.error);
				// QuotaExceededError surfaces on the transaction's abort, not the
				// request — propagate it so callers (bibleSync) can react.
				tx.onabort = () => reject(tx.error);
			}),
	);
}

/** Verses for one chapter of a stored book, or null if not present. */
export async function getChapter(
	abbrev: string,
	chapter: number,
): Promise<ChapterVerse[] | null> {
	const book = await withStore<StoredBook | undefined>(
		BOOKS_STORE,
		"readonly",
		(s) => s.get(abbrev),
	);
	if (!book) return null;
	return book.chapters[String(chapter)] ?? null;
}

/** Write a whole book's chapters under its abbrev, tagged with `version`. */
export async function putBook(
	abbrev: string,
	data: { chapters: BookChapters },
	version: string,
): Promise<void> {
	const value: StoredBook = { chapters: data.chapters, version };
	await withStore<IDBValidKey>(BOOKS_STORE, "readwrite", (s) =>
		s.put(value, abbrev),
	);
}

/** The single offline-sync meta record, or null before the first sync. */
export async function getMeta(): Promise<OfflineMeta | null> {
	const meta = await withStore<OfflineMeta | undefined>(
		META_STORE,
		"readonly",
		(s) => s.get(META_KEY),
	);
	return meta ?? null;
}

/** Persist the offline-sync meta record. */
export async function setMeta(meta: OfflineMeta): Promise<void> {
	await withStore<IDBValidKey>(META_STORE, "readwrite", (s) =>
		s.put(meta, META_KEY),
	);
}

/** True only when the book is stored AND tagged with the expected version. */
export async function isBookSynced(
	abbrev: string,
	version: string,
): Promise<boolean> {
	const book = await withStore<StoredBook | undefined>(
		BOOKS_STORE,
		"readonly",
		(s) => s.get(abbrev),
	);
	// Optional chaining narrows cleanly: undefined book → undefined !== version.
	return book?.version === version;
}

/** Drop the entire offline dataset (toggle off / quota cleanup). */
export async function clearStore(): Promise<void> {
	await withStore<undefined>(BOOKS_STORE, "readwrite", (s) => s.clear());
	await withStore<undefined>(META_STORE, "readwrite", (s) => s.clear());
}
