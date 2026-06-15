import { describe, it, expect, beforeEach } from "vitest";
// fake-indexeddb/auto installs a global `indexedDB` for the node test env.
import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import {
  getChapter,
  putBook,
  getMeta,
  setMeta,
  isBookSynced,
} from "./bibleStore";

const GN_CHAPTERS = {
  "1": [
    { n: 1, t: "No princípio" },
    { n: 2, t: "A terra era sem forma" },
  ],
};

describe("bibleStore", () => {
  beforeEach(() => {
    // Fresh in-memory DB per test so writes don't leak across cases.
    // eslint-disable-next-line no-global-assign
    indexedDB = new IDBFactory();
  });

  it("round-trips a book → chapter → verses", async () => {
    await putBook("gn", { chapters: GN_CHAPTERS }, "v1.abc");
    const ch = await getChapter("gn", 1);
    expect(ch).toEqual([
      { n: 1, t: "No princípio" },
      { n: 2, t: "A terra era sem forma" },
    ]);
  });

  it("returns null for a chapter that isn't stored", async () => {
    expect(await getChapter("gn", 99)).toBeNull();
    expect(await getChapter("ex", 1)).toBeNull();
  });

  it("persists and reads meta", async () => {
    expect(await getMeta()).toBeNull();
    await setMeta({ version: "v1.abc", syncedAt: 123, status: "syncing" });
    expect(await getMeta()).toEqual({
      version: "v1.abc",
      syncedAt: 123,
      status: "syncing",
    });
  });

  it("isBookSynced gates on a matching stored version", async () => {
    expect(await isBookSynced("gn", "v1.abc")).toBe(false);
    await putBook("gn", { chapters: GN_CHAPTERS }, "v1.abc");
    expect(await isBookSynced("gn", "v1.abc")).toBe(true);
    // A version bump invalidates the previously-synced book.
    expect(await isBookSynced("gn", "v2.def")).toBe(false);
  });
});
