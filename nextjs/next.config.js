const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});
const { withSentryConfig } = require("@sentry/nextjs");
// Next's default list of bots that get blocking (non-streamed) metadata.
// Internal path: if a Next upgrade moves it, config loading fails loudly
// instead of silently dropping Googlebot from the list below.
const {
  HTML_LIMITED_BOT_UA_RE,
} = require("next/dist/shared/lib/router/utils/html-bots");

// Auth pages that must never be indexed. Their segment layouts also export
// robots noindex metadata; the header covers every ?callbackUrl= variant
// before any HTML is parsed.
const NOINDEX_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Mongoose is loaded only on the server; opting it out of bundling keeps
  // Webpack from pulling its native bson bindings into the edge runtime.
  // (Next 15 moved this option out of `experimental`.)
  serverExternalPackages: ["mongoose"],
  // `experimental.instrumentationHook` was removed — instrumentation.ts is
  // now picked up automatically by Next 15.
  images: {
    unoptimized: true,
  },
  // Googlebot is not in Next's default htmlLimitedBots list, so it gets
  // streamed metadata: <title>/<meta robots> land in <body>, and on fast
  // pages React inlines its boundary-completion script, whose "/&" string
  // literal Googlebot crawled as https://biblecomment.com.br/& (a 404 in
  // Search Console). Serving Google's crawlers blocking metadata removes
  // that script and keeps the tags in <head>.
  htmlLimitedBots: new RegExp(
    `Googlebot|GoogleOther|${HTML_LIMITED_BOT_UA_RE.source}`,
    "i",
  ),
  async redirects() {
    return [
      // Leftover URL from the legacy Create React App build. statusCode
      // instead of `permanent: true`, which would send a 308.
      { source: "/index.html", destination: "/", statusCode: 301 },
    ];
  },
  async headers() {
    return [
      ...NOINDEX_PATHS.map((source) => ({
        source,
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      })),
      {
        source: "/assets/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/:all*(svg|png|jpg|jpeg|webp|ico|woff2)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
  webpack(config, { isServer }) {
    // @sentry/nextjs (server) pulls @sentry/node which auto-loads
    // @prisma/instrumentation. The latter uses OpenTelemetry's dynamic
    // require() pattern that webpack can't statically analyze, producing
    // "Critical dependency: the request of a dependency is an expression"
    // warnings on every server build. We don't use Prisma; the warning
    // is purely noise.
    if (isServer) {
      config.ignoreWarnings = [
        ...(config.ignoreWarnings ?? []),
        { module: /@opentelemetry\/instrumentation/ },
        { module: /@prisma\/instrumentation/ },
      ];
    }
    return config;
  },
};

/**
 * Sentry build-time wrapper. Uploads source maps + creates a release per deploy.
 * Skipped when `SENTRY_AUTH_TOKEN` isn't set (local dev / PRs without secrets) —
 * the build still succeeds, just without source-map upload.
 */
const sentryEnabled = !!process.env.SENTRY_AUTH_TOKEN;

const sentryWebpackPluginOptions = {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !sentryEnabled,
  // Hides source maps from the deployed bundle (uploaded to Sentry, not served).
  hideSourceMaps: true,
  // Tunnel browser SDK requests through /monitoring to bypass ad-blockers.
  tunnelRoute: "/monitoring",
  // Don't fail the build if Sentry CLI errors out — observability shouldn't
  // be a deploy gate.
  errorHandler: (err) => {
    console.warn("[sentry] source-map upload failed:", err.message);
  },
};

const wrappedConfig = sentryEnabled
  ? withSentryConfig(nextConfig, sentryWebpackPluginOptions)
  : nextConfig;

module.exports = withBundleAnalyzer(wrappedConfig);
