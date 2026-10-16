import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Book } from "@/domain/entities/Book";
import type { Community } from "@/domain/entities/Community";

const repo = vi.hoisted(() => ({
  findAllBooks: vi.fn(),
  listCommunities: vi.fn(),
  lastModifiedByChapter: vi.fn(),
  lastModifiedByBook: vi.fn(),
  approvedUserIdsByCommunity: vi.fn(),
  findUsersByIds: vi.fn(),
  lastModifiedByUsername: vi.fn(),
}));

vi.mock("@/infrastructure/repositories/MongoBookRepository", () => ({
  MongoBookRepository: class {
    findAll = repo.findAllBooks;
  },
}));
vi.mock("@/infrastructure/repositories/MongoCommunityRepository", () => ({
  MongoCommunityRepository: class {
    list = repo.listCommunities;
  },
}));
vi.mock("@/infrastructure/repositories/MongoCommentRepository", () => ({
  MongoCommentRepository: class {
    lastModifiedByChapter = repo.lastModifiedByChapter;
    lastModifiedByUsername = repo.lastModifiedByUsername;
  },
}));
vi.mock("@/infrastructure/repositories/MongoDiscussionRepository", () => ({
  MongoDiscussionRepository: class {
    lastModifiedByBook = repo.lastModifiedByBook;
  },
}));
vi.mock("@/infrastructure/repositories/MongoCommunityMembershipRepository", () => ({
  MongoCommunityMembershipRepository: class {
    approvedUserIdsByCommunity = repo.approvedUserIdsByCommunity;
  },
}));
vi.mock("@/infrastructure/repositories/MongoUserRepository", () => ({
  MongoUserRepository: class {
    findManyByIds = repo.findUsersByIds;
  },
}));
vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import sitemap from "@/app/sitemap";
import robots from "@/app/robots";
// Next's own serializers — the exact robots.txt / sitemap.xml text it serves.
import { resolveRobots, resolveSitemap } from "next/dist/build/webpack/loaders/metadata/resolve-route-data";

const BASE = "https://biblecomment.com.br";
const gn: Book = { abbrev: "gn", name: "Gênesis", chapters: 3, author: "Moisés", group: "Pentateuco", testament: "VT" };
const ex: Book = { abbrev: "ex", name: "Êxodo", chapters: 2, author: "Moisés", group: "Pentateuco", testament: "VT" };
const reformados: Community = {
  _id: "c1",
  slug: "reformados",
  name: "Reformados",
  description: "",
  createdBy: "u1",
  memberCount: 3,
  followerCount: 0,
  updatedAt: new Date("2026-03-01T12:00:00Z"),
};
const batistas: Community = {
  _id: "c2",
  slug: "batistas",
  name: "Batistas",
  description: "",
  createdBy: "u2",
  memberCount: 1,
  followerCount: 0,
  updatedAt: new Date("2026-04-01T12:00:00Z"),
};

async function entriesByPath() {
  const entries = await sitemap();
  return new Map(entries.map((e) => [e.url.slice(BASE.length) || "/", e]));
}

describe("sitemap()", () => {
  beforeEach(() => {
    vi.stubEnv("NEXTAUTH_URL", `${BASE}/`);
    repo.findAllBooks.mockReset().mockResolvedValue([gn, ex]);
    repo.listCommunities.mockReset().mockResolvedValue({ items: [reformados, batistas], total: 2 });
    repo.lastModifiedByChapter.mockReset().mockResolvedValue({ "gn/2": "2026-05-10T08:00:00.000Z" });
    repo.lastModifiedByBook.mockReset().mockResolvedValue({ gn: "2026-05-31T02:22:09.850Z" });
    // reformados: two members, one of whom commented after the community
    // doc last changed. batistas: one member who never commented.
    repo.approvedUserIdsByCommunity.mockReset().mockResolvedValue({ c1: ["u1", "u3"], c2: ["u2"] });
    repo.findUsersByIds.mockReset().mockResolvedValue([
      { _id: "u1", username: "ana" },
      { _id: "u2", username: "bia" },
      { _id: "u3", username: "caio" },
    ]);
    repo.lastModifiedByUsername.mockReset().mockResolvedValue({
      ana: "2026-02-01T09:00:00.000Z",
      caio: "2026-06-02T09:00:00.000Z",
    });
  });
  afterEach(() => vi.unstubAllEnvs());

  it("excludes auth/utility routes and query-string URLs", async () => {
    const paths = [...(await entriesByPath()).keys()];
    for (const p of ["/login", "/register", "/forgot-password", "/reset-password", "/verify-email", "/offline"]) {
      expect(paths).not.toContain(p);
    }
    expect(paths.some((p) => p.includes("?"))).toBe(false);
  });

  it("keeps every public content URL", async () => {
    const paths = [...(await entriesByPath()).keys()];
    expect(paths).toEqual([
      "/",
      "/help",
      "/communities",
      "/communities/reformados",
      "/communities/batistas",
      "/comentario",
      "/comentario/genesis",
      "/comentario/exodo",
      "/verses/gn/1",
      "/verses/gn/2",
      "/verses/gn/3",
      "/verses/ex/1",
      "/verses/ex/2",
    ]);
  });

  it("dates chapters by their newest comment and omits the rest", async () => {
    const byPath = await entriesByPath();
    expect(byPath.get("/verses/gn/2")?.lastModified).toEqual(new Date("2026-05-10T08:00:00.000Z"));
    expect(byPath.get("/verses/gn/1")).not.toHaveProperty("lastModified");
    expect(byPath.get("/verses/ex/1")).not.toHaveProperty("lastModified");
  });

  it("dates commentary hubs by their newest discussion and omits the rest", async () => {
    const byPath = await entriesByPath();
    expect(byPath.get("/comentario/genesis")?.lastModified).toEqual(new Date("2026-05-31T02:22:09.850Z"));
    expect(byPath.get("/comentario/exodo")).not.toHaveProperty("lastModified");
  });

  it("dates communities by the newest of the community doc and its members' comments", async () => {
    const byPath = await entriesByPath();
    expect(byPath.get("/communities/reformados")?.lastModified).toEqual(new Date("2026-06-02T09:00:00Z"));
    expect(byPath.get("/communities/batistas")?.lastModified).toEqual(batistas.updatedAt);
    // One batched lookup for every community, not one per community.
    expect(repo.approvedUserIdsByCommunity).toHaveBeenCalledTimes(1);
    expect(repo.approvedUserIdsByCommunity).toHaveBeenCalledWith(["c1", "c2"]);
    expect(repo.lastModifiedByUsername).toHaveBeenCalledWith(["ana", "bia", "caio"]);
    // The index lists the community docs only.
    expect(byPath.get("/communities")?.lastModified).toEqual(batistas.updatedAt);
  });

  it("omits lastmod on pages without a reliable change date", async () => {
    const byPath = await entriesByPath();
    for (const p of ["/", "/help", "/comentario"]) {
      expect(byPath.get(p)).not.toHaveProperty("lastModified");
    }
  });

  it("never stamps the request time", async () => {
    vi.useFakeTimers({ now: new Date("2026-10-15T12:00:00Z"), toFake: ["Date"] });
    try {
      for (const entry of await sitemap()) {
        if (entry.lastModified) {
          expect(new Date(entry.lastModified).getTime()).not.toBe(Date.now());
        }
      }
    } finally {
      vi.useRealTimers();
    }
  });

  it("serializes without <lastmod> where the date is unknown", async () => {
    const xml = resolveSitemap(await sitemap());
    expect(xml).not.toMatch(/<loc>[^<]+\/(login|register)<\/loc>/);
    expect(xml).toContain(`<loc>${BASE}/verses/gn/2</loc>\n<lastmod>2026-05-10T08:00:00.000Z</lastmod>\n`);
    expect(xml).toContain(`<loc>${BASE}/verses/gn/1</loc>\n<changefreq>`);
    expect(xml).not.toContain(`${BASE}//`);
  });

  it("keeps the URLs when a lastmod source fails", async () => {
    repo.lastModifiedByChapter.mockRejectedValue(new Error("db down"));
    repo.lastModifiedByBook.mockRejectedValue(new Error("db down"));
    repo.lastModifiedByUsername.mockRejectedValue(new Error("db down"));
    const byPath = await entriesByPath();
    expect(byPath.get("/verses/gn/2")).not.toHaveProperty("lastModified");
    expect(byPath.get("/comentario/genesis")).not.toHaveProperty("lastModified");
    // Can't know whether a member commented, so don't fall back to updatedAt.
    expect(byPath.get("/communities/reformados")).not.toHaveProperty("lastModified");
    expect(byPath.size).toBe(13);
  });

  it("degrades to the static and community pages when the book repo fails", async () => {
    repo.findAllBooks.mockRejectedValue(new Error("db down"));
    repo.listCommunities.mockRejectedValue(new Error("db down"));
    const paths = [...(await entriesByPath()).keys()];
    expect(paths).toEqual(["/", "/help", "/communities"]);
    const byPath = await entriesByPath();
    expect(byPath.get("/communities")).not.toHaveProperty("lastModified");
  });
});

describe("robots()", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("disallows the auth pages and keeps the existing rules", () => {
    vi.stubEnv("NEXTAUTH_URL", `${BASE}/`);
    const txt = resolveRobots(robots());
    for (const line of [
      "Allow: /",
      "Disallow: /api/",
      "Disallow: /admin",
      "Disallow: /profile",
      "Disallow: /backup",
      "Disallow: /discussions",
      "Disallow: /login",
      "Disallow: /register",
    ]) {
      expect(txt).toContain(`${line}\n`);
    }
    expect(txt).toContain(`Sitemap: ${BASE}/sitemap.xml`);
  });
});
