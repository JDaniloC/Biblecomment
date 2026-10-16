import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Auth-gated and admin surfaces. Crawlers shouldn't index them
      // (they redirect to /login anyway, but pre-empting saves crawl
      // budget). /login and /register are blocked too: every chapter
      // used to link to its own /login?callbackUrl=... variant, and
      // Googlebot was collecting them as duplicate URLs. robots.txt
      // matching is a path prefix that includes the query string, so
      // these two lines cover every ?callbackUrl= variant.
      disallow: [
        "/api/",
        "/admin",
        "/profile",
        "/backup",
        "/discussions",
        "/login",
        "/register",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
