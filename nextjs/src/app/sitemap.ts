import type { MetadataRoute } from "next";
import { MongoBookRepository } from "@/infrastructure/repositories/MongoBookRepository";
import { logger } from "@/lib/logger";

const STATIC_CHANGE_FREQ: MetadataRoute.Sitemap[number]["changeFrequency"] = "monthly";
const CHAPTER_CHANGE_FREQ: MetadataRoute.Sitemap[number]["changeFrequency"] = "weekly";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (process.env.NEXTAUTH_URL ?? "http://localhost:5000").replace(/\/+$/, "");
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`,         lastModified: now, changeFrequency: "daily",        priority: 1.0 },
    { url: `${baseUrl}/login`,    lastModified: now, changeFrequency: "yearly",       priority: 0.3 },
    { url: `${baseUrl}/register`, lastModified: now, changeFrequency: "yearly",       priority: 0.3 },
    { url: `${baseUrl}/help`,     lastModified: now, changeFrequency: STATIC_CHANGE_FREQ, priority: 0.5 },
  ];

  // Discoverable chapter URLs. Auth gates the actual content, but
  // sitemap submission still helps when the gate is later relaxed and
  // signals the link graph today.
  let chapterPages: MetadataRoute.Sitemap = [];
  try {
    const bookRepo = new MongoBookRepository();
    const books = await bookRepo.findAll();
    chapterPages = books.flatMap((book) => {
      const urls: MetadataRoute.Sitemap = [];
      const total = Number(book.chapters);
      if (!Number.isFinite(total) || total <= 0) return urls;
      for (let ch = 1; ch <= total; ch++) {
        urls.push({
          url: `${baseUrl}/verses/${book.abbrev}/${ch}`,
          lastModified: now,
          changeFrequency: CHAPTER_CHANGE_FREQ,
          priority: 0.7,
        });
      }
      return urls;
    });
  } catch (err) {
    // Build-time generation may run before Mongo is reachable. Falling
    // back to the static set keeps the build green; the sitemap will
    // populate once /sitemap.xml is requested in a runtime that has DB
    // access.
    logger.warn({ err }, "sitemap: skipping chapter pages — book repo unavailable");
  }

  return [...staticPages, ...chapterPages];
}
