import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { syncOfflineBible } from "./bibleSync";
import { putBook, getMeta, getChapter, isBookSynced } from "./bibleStore";

const VERSION = "v1.abc";
const BOOKS = [
	{ abbrev: "gn", chapters: 1 },
	{ abbrev: "ex", chapters: 1 },
];

function booksResponse() {
	return {
		ok: true,
		json: () => Promise.resolve({ books: BOOKS, version: VERSION }),
	} as Response;
}

function bookVersesResponse(abbrev: string) {
	return {
		ok: true,
		json: () =>
			Promise.resolve({
				abbrev,
				chapters: { "1": [{ n: 1, t: `${abbrev} 1:1` }] },
			}),
	} as Response;
}

// Routes a fetch URL to the right canned response.
function routeFetch(url: string): Response {
	if (url === "/api/books") return booksResponse();
	const match = url.match(/^\/api\/books\/([^/]+)\/verses$/);
	if (match) return bookVersesResponse(match[1]);
	throw new Error(`unexpected fetch ${url}`);
}

describe("syncOfflineBible", () => {
	beforeEach(() => {
		// eslint-disable-next-line no-global-assign
		indexedDB = new IDBFactory();
		vi.restoreAllMocks();
	});
	afterEach(() => vi.restoreAllMocks());

	it("downloads only the missing books and marks ready", async () => {
		const fetchMock = vi
			.fn()
			.mockImplementation((url: string) => Promise.resolve(routeFetch(url)));
		vi.stubGlobal("fetch", fetchMock);

		await syncOfflineBible({ enabled: true });

		expect(await getChapter("gn", 1)).toEqual([{ n: 1, t: "gn 1:1" }]);
		expect(await getChapter("ex", 1)).toEqual([{ n: 1, t: "ex 1:1" }]);
		const meta = await getMeta();
		expect(meta?.status).toBe("ready");
		expect(meta?.version).toBe(VERSION);
		// /api/books once + one per book.
		const fetchedBookUrls = fetchMock.mock.calls
			.map((c) => c[0] as string)
			.filter((u) => u.endsWith("/verses"));
		expect(fetchedBookUrls.sort()).toEqual([
			"/api/books/ex/verses",
			"/api/books/gn/verses",
		]);
	});

	it("is a no-op when version matches and all books are present", async () => {
		await putBook("gn", { chapters: { "1": [{ n: 1, t: "x" }] } }, VERSION);
		await putBook("ex", { chapters: { "1": [{ n: 1, t: "y" }] } }, VERSION);
		const fetchMock = vi
			.fn()
			.mockImplementation((url: string) => Promise.resolve(routeFetch(url)));
		vi.stubGlobal("fetch", fetchMock);

		await syncOfflineBible({ enabled: true });

		// Only /api/books fetched; no per-book downloads.
		const bookFetches = fetchMock.mock.calls
			.map((c) => c[0] as string)
			.filter((u) => u.endsWith("/verses"));
		expect(bookFetches).toEqual([]);
		expect((await getMeta())?.status).toBe("ready");
	});

	it("only fetches books that aren't already synced (resumable)", async () => {
		await putBook("gn", { chapters: { "1": [{ n: 1, t: "x" }] } }, VERSION);
		const fetchMock = vi
			.fn()
			.mockImplementation((url: string) => Promise.resolve(routeFetch(url)));
		vi.stubGlobal("fetch", fetchMock);

		await syncOfflineBible({ enabled: true });

		const bookFetches = fetchMock.mock.calls
			.map((c) => c[0] as string)
			.filter((u) => u.endsWith("/verses"));
		expect(bookFetches).toEqual(["/api/books/ex/verses"]);
		expect(await isBookSynced("ex", VERSION)).toBe(true);
	});

	it("preserves partial progress on a network drop and marks partial", async () => {
		const fetchMock = vi.fn().mockImplementation((url: string) => {
			if (url === "/api/books") return Promise.resolve(booksResponse());
			if (url === "/api/books/gn/verses")
				return Promise.resolve(bookVersesResponse("gn"));
			// ex fails — simulate a dropped connection mid-sync.
			return Promise.reject(new Error("network down"));
		});
		vi.stubGlobal("fetch", fetchMock);

		await syncOfflineBible({ enabled: true });

		// gn persisted, ex absent, status reflects the incomplete run.
		expect(await getChapter("gn", 1)).toEqual([{ n: 1, t: "gn 1:1" }]);
		expect(await getChapter("ex", 1)).toBeNull();
		expect((await getMeta())?.status).toBe("partial");
	});

	it("does nothing when the toggle is off", async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);

		await syncOfflineBible({ enabled: false });

		expect(fetchMock).not.toHaveBeenCalled();
		expect(await getMeta()).toBeNull();
	});
});
