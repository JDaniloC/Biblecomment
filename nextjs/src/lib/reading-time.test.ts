import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
	brtDayKey,
	getAccumulatedSeconds,
	addReadingSeconds,
	hasPostedSession,
	markSessionPosted,
	READING_SESSION_THRESHOLD_SECONDS,
} from "./reading-time";

function installStorage(): Storage {
	const store = new Map<string, string>();
	const storage = {
		getItem: (k: string) => store.get(k) ?? null,
		setItem: (k: string, v: string) => store.set(k, v),
		removeItem: (k: string) => store.delete(k),
		clear: () => store.clear(),
		key: (i: number) => Array.from(store.keys())[i] ?? null,
		get length() {
			return store.size;
		},
	} as unknown as Storage;
	vi.stubGlobal("window", { localStorage: storage });
	return storage;
}

describe("brtDayKey", () => {
	it("formats a BRT calendar day", () => {
		// 2026-05-21 02:00 UTC == 23:00 on 2026-05-20 in BRT.
		expect(brtDayKey(new Date("2026-05-21T02:00:00Z"))).toBe("2026-05-20");
		// 2026-05-21 15:00 UTC == 12:00 on the 21st in BRT.
		expect(brtDayKey(new Date("2026-05-21T15:00:00Z"))).toBe("2026-05-21");
	});
});

describe("reading-time accumulation", () => {
	beforeEach(() => {
		installStorage();
	});
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("starts at zero", () => {
		expect(getAccumulatedSeconds("2026-05-21")).toBe(0);
	});

	it("accumulates across calls", () => {
		expect(addReadingSeconds(30, "2026-05-21")).toBe(30);
		expect(addReadingSeconds(45, "2026-05-21")).toBe(75);
		expect(getAccumulatedSeconds("2026-05-21")).toBe(75);
	});

	it("ignores non-positive deltas", () => {
		addReadingSeconds(60, "2026-05-21");
		expect(addReadingSeconds(0, "2026-05-21")).toBe(60);
		expect(addReadingSeconds(-10, "2026-05-21")).toBe(60);
	});

	it("prunes stale keys from previous days", () => {
		addReadingSeconds(100, "2026-05-19");
		addReadingSeconds(50, "2026-05-20");
		// Writing to the 21st should evict the 19th and 20th tallies.
		addReadingSeconds(10, "2026-05-21");
		expect(getAccumulatedSeconds("2026-05-19")).toBe(0);
		expect(getAccumulatedSeconds("2026-05-20")).toBe(0);
		expect(getAccumulatedSeconds("2026-05-21")).toBe(10);
	});

	it("tracks the posted flag per day", () => {
		expect(hasPostedSession("2026-05-21")).toBe(false);
		markSessionPosted("2026-05-21");
		expect(hasPostedSession("2026-05-21")).toBe(true);
		// A different day is unaffected.
		expect(hasPostedSession("2026-05-22")).toBe(false);
	});

	it("exposes a 10-minute threshold", () => {
		expect(READING_SESSION_THRESHOLD_SECONDS).toBe(600);
	});
});
