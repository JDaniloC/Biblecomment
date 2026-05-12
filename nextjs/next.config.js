const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});
const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["mongoose"],
    instrumentationHook: true,
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
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
