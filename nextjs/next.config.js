const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

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

module.exports = withBundleAnalyzer(nextConfig);
