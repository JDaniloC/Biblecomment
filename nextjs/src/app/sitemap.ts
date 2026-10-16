import type { MetadataRoute } from "next";
import { MongoBookRepository } from "@/infrastructure/repositories/MongoBookRepository";
import { MongoCommentRepository } from "@/infrastructure/repositories/MongoCommentRepository";
import { MongoCommunityMembershipRepository } from "@/infrastructure/repositories/MongoCommunityMembershipRepository";
import { MongoCommunityRepository } from "@/infrastructure/repositories/MongoCommunityRepository";
import { MongoDiscussionRepository } from "@/infrastructure/repositories/MongoDiscussionRepository";
import { MongoUserRepository } from "@/infrastructure/repositories/MongoUserRepository";
import type { Community } from "@/domain/entities/Community";
import { logger } from "@/lib/logger";
import { bookSlug } from "@/lib/book-slug";

// Without this, Next.js 14 statically renders the sitemap at `next build`
// time. The book list is captured then — empty in CI before the seed,
// stale in prod after new books land. force-dynamic re-runs the function
// per request so the chapter URLs always reflect current DB state.
export const dynamic = "force-dynamic";

const STATIC_CHANGE_FREQ: MetadataRoute.Sitemap[number]["changeFrequency"] = "monthly";
const CHAPTER_CHANGE_FREQ: MetadataRoute.Sitemap[number]["changeFrequency"] = "weekly";

// <lastmod> policy: the date of the last real change to the content a URL
// renders, never the request or build time. Where there's no reliable
// source (static pages, chapters nobody has commented on) the tag is
// omitted rather than guessed. The date lookups are deliberately
// uncached: unstable_cache serves stale-while-revalidate, so with crawlers
// fetching less than hourly every response would carry the previous
// fetch's dates. They are a handful of aggregations per fetch.
//
// Auth and utility routes (/login, /register, password reset, offline, …)
// are deliberately absent: they are noindex and must not be submitted.

/** Newest of the given dates; undefined when none is valid. */
function latest(...dates: Array<string | Date | null | undefined>): Date | undefined {
  let newest: Date | undefined;
  for (const value of dates) {
    if (!value) continue;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) continue;
    if (!newest || date > newest) newest = date;
  }
  return newest;
}

/** Spreads `lastModified` only when a date is known, so no empty tag is emitted. */
function lastModified(date: Date | undefined): Pick<MetadataRoute.Sitemap[number], "lastModified"> {
  return date ? { lastModified: date } : {};
}

// A community page lists comments by its approved members, so any write to
// them (new, edited, hidden/unhidden) changes the page. Approving a member
// bumps Community.updatedAt (memberCount $inc), which covers members whose
// older comments start showing up. Three queries for every community at
// once; hard-deleted comments leave no trace. Returns ISO dates keyed by
// community id; communities whose members never commented are absent.
async function memberCommentLastmod(communities: Community[]): Promise<Record<string, string>> {
  const ids = communities.map((c) => c._id).filter((id): id is string => !!id);
  const membersByCommunity = await new MongoCommunityMembershipRepository().approvedUserIdsByCommunity(ids);
  const userIds = [...new Set(Object.values(membersByCommunity).flat())];
  const users = await new MongoUserRepository().findManyByIds(userIds);
  const usernameById = new Map(users.map((u) => [u._id, u.username]));
  const byUsername = await new MongoCommentRepository().lastModifiedByUsername(
    users.map((u) => u.username).filter(Boolean),
  );
  const byCommunity: Record<string, string> = {};
  for (const [communityId, memberIds] of Object.entries(membersByCommunity)) {
    const date = latest(...memberIds.map((id) => byUsername[usernameById.get(id) ?? ""]));
    if (date) byCommunity[communityId] = date.toISOString();
  }
  return byCommunity;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/+$/, "");

  // Public community detail pages. Communities have no private/visibility
  // notion — every one is discoverable — so we page through the same `list`
  // the discovery page uses. Wrapped in its own try/catch so a repo failure
  // degrades to the static set without taking down the whole sitemap.
  const communities: Community[] = [];
  try {
    const communityRepo = new MongoCommunityRepository();
    const PAGE_SIZE = 100;
    let page = 1;
    for (;;) {
      const { items, total } = await communityRepo.list({ page, pageSize: PAGE_SIZE });
      communities.push(...items);
      if (page * PAGE_SIZE >= total || items.length === 0) break;
      page += 1;
    }
  } catch (err) {
    logger.warn({ err }, "sitemap: skipping community pages — community repo unavailable");
  }

  // A failed member lookup omits the community lastmods instead of
  // guessing from updatedAt alone.
  let memberLastmod: Record<string, string> | null = null;
  if (communities.length > 0) {
    try {
      memberLastmod = await memberCommentLastmod(communities);
    } catch (err) {
      logger.warn({ err }, "sitemap: omitting community lastmod — member lookup failed");
    }
  }
  const communityPages: MetadataRoute.Sitemap = communities.map((c) => ({
    url: `${baseUrl}/communities/${c.slug}`,
    ...lastModified(memberLastmod ? latest(c.updatedAt, c._id && memberLastmod[c._id]) : undefined),
    changeFrequency: CHAPTER_CHANGE_FREQ,
    priority: 0.5,
  }));

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`,     changeFrequency: "daily",            priority: 1.0 },
    { url: `${baseUrl}/help`, changeFrequency: STATIC_CHANGE_FREQ, priority: 0.5 },
    {
      url: `${baseUrl}/communities`,
      // The index lists every community with its counts; any change to a
      // community document bumps its updatedAt.
      ...lastModified(latest(...communities.map((c) => c.updatedAt))),
      changeFrequency: "weekly",
      priority: 0.6,
    },
  ];

  // Book commentary hub pages (/comentario + /comentario/{slug}) and the
  // discoverable chapter URLs. A book repo failure (build-time generation
  // may run before Mongo is reachable) degrades to the static set; a
  // lastmod source failure only drops the dates, never the URLs.
  let commentaryPages: MetadataRoute.Sitemap = [];
  let chapterPages: MetadataRoute.Sitemap = [];
  try {
    const books = await new MongoBookRepository().findAll();
    const [bookLastmod, chapterLastmod] = await Promise.all([
      new MongoDiscussionRepository().lastModifiedByBook().catch((err: unknown) => {
        logger.warn({ err }, "sitemap: omitting commentary lastmod — discussion repo unavailable");
        return {} as Record<string, string>;
      }),
      new MongoCommentRepository().lastModifiedByChapter().catch((err: unknown) => {
        logger.warn({ err }, "sitemap: omitting chapter lastmod — comment repo unavailable");
        return {} as Record<string, string>;
      }),
    ]);

    commentaryPages = [
      // The index only renders the static book list.
      { url: `${baseUrl}/comentario`, changeFrequency: STATIC_CHANGE_FREQ, priority: 0.7 },
      ...books.map((book) => ({
        url: `${baseUrl}/comentario/${bookSlug(book.name)}`,
        ...lastModified(latest(bookLastmod[book.abbrev])),
        changeFrequency: STATIC_CHANGE_FREQ,
        priority: 0.7,
      })),
    ];

    // Verse text never changes; what does is the comment activity the
    // chapter page renders (per-verse counts).
    chapterPages = books.flatMap((book) => {
      const urls: MetadataRoute.Sitemap = [];
      const total = Number(book.chapters);
      if (!Number.isFinite(total) || total <= 0) return urls;
      for (let ch = 1; ch <= total; ch++) {
        urls.push({
          url: `${baseUrl}/verses/${book.abbrev}/${ch}`,
          ...lastModified(latest(chapterLastmod[`${book.abbrev}/${ch}`])),
          changeFrequency: CHAPTER_CHANGE_FREQ,
          priority: 0.7,
        });
      }
      return urls;
    });
  } catch (err) {
    logger.warn({ err }, "sitemap: skipping commentary and chapter pages — book repo unavailable");
  }

  return [...staticPages, ...communityPages, ...commentaryPages, ...chapterPages];
}
