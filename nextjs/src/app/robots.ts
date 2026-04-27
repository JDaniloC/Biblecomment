import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:5000";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Auth-gated and admin surfaces. Crawlers shouldn't index them
      // (they redirect to /login anyway, but pre-empting saves crawl
      // budget).
      disallow: ["/api/", "/admin", "/profile", "/backup", "/discussions"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
