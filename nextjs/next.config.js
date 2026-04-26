/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["mongoose"],
    instrumentationHook: true,
  },
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
