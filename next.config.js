/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove output: 'export' to enable preview functionality
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  assetPrefix: "/blog-cms",
  basePath: "/blog-cms",
};

module.exports = nextConfig;
