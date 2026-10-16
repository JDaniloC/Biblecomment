import { describe, it, expect } from "vitest";
import type { UserDataExport } from "@/domain/dto/UserDataExportDTO";
import {
  USER_DATA_EXPORT_NOT_INCLUDED,
  USER_DATA_EXPORT_VERSION,
} from "@/domain/dto/UserDataExportDTO";
import { buildExportResponse, exportCounts, exportFilename } from "./buildResponse";

function dump(username = "alice"): UserDataExport {
  return {
    exportVersion: USER_DATA_EXPORT_VERSION,
    generatedAt: "2026-10-16T12:00:00.000Z",
    profile: {
      _id: "u1",
      email: "alice@example.com",
      username,
      displayName: "Alice Souza",
      state: "SP",
      belief: "Católica",
      showBelief: false,
      moderator: false,
      emailVerifiedAt: null,
      pendingEmail: null,
      tutorialsCompleted: [],
      badges: [],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: null,
    },
    comments: [
      {
        _id: "c1",
        username,
        verseId: "v1",
        bookReference: "gn 1:1",
        onTitle: false,
        text: "Comentário âncora — com acentos: ação, já, você.",
        tags: ["devocional"],
        communitySlug: null,
        verified: false,
        verifiedAt: null,
        hiddenAt: null,
        hiddenReason: null,
        createdAt: "2026-05-01T00:00:00.000Z",
        updatedAt: null,
      },
    ],
    ownedDiscussions: [],
    answersAuthored: [],
    notifications: [],
    likesGiven: {
      comments: [{ commentId: "c2", bookReference: null, likedAt: null }],
      discussions: [],
      answers: [{ answerId: "a1", likedAt: null }],
    },
    commentReports: [],
    communities: { created: [], memberships: [], follows: [] },
    social: {
      following: [{ username: "bob", displayName: null, since: null }],
      followers: [],
    },
    reading: { chaptersRead: [], activeDays: ["2026-10-16"], reminder: null },
    pushSubscriptions: [],
    notIncluded: USER_DATA_EXPORT_NOT_INCLUDED.map((e) => ({ ...e })),
  };
}

describe("buildExportResponse", () => {
  it("serves an uncacheable UTF-8 JSON attachment", () => {
    const { response } = buildExportResponse(dump());

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("content-type")).toContain("charset=utf-8");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="biblecomment-meus-dados-alice-2026-10-16.json"',
    );
  });

  it("names the file with an ASCII slug of a legacy username", () => {
    const { response } = buildExportResponse(dump('João "Zé" Silva'));
    const header = response.headers.get("content-disposition") ?? "";

    expect(header).toBe(
      'attachment; filename="biblecomment-meus-dados-joao-ze-silva-2026-10-16.json"',
    );
    expect(header).toMatch(/^[\x20-\x7e]+$/);
  });

  it('falls back to "usuario" when nothing of the username survives sanitizing', () => {
    expect(exportFilename(dump("!!"))).toBe("biblecomment-meus-dados-usuario-2026-10-16.json");
  });

  it("pretty-prints a body that parses back to the dump, accents intact, and reports its byte size", async () => {
    const original = dump();
    const { response, bytes } = buildExportResponse(original);
    const text = await response.text();

    expect(text).toContain('\n  "exportVersion": 2');
    expect(JSON.parse(text)).toEqual(original);
    expect(JSON.parse(text).comments[0].text).toBe(
      "Comentário âncora — com acentos: ação, já, você.",
    );
    // Multi-byte characters: bytes, not string length.
    expect(bytes).toBe(Buffer.byteLength(text, "utf8"));
    expect(bytes).toBeGreaterThan(text.length);
  });
});

describe("exportCounts", () => {
  it("counts rows per section without any content", () => {
    expect(exportCounts(dump())).toEqual({
      comments: 1,
      ownedDiscussions: 0,
      answersAuthored: 0,
      notifications: 0,
      likesGiven: 2,
      commentReports: 0,
      communities: 0,
      follows: 1,
      chaptersRead: 0,
      activeDays: 1,
      pushSubscriptions: 0,
    });
  });
});
