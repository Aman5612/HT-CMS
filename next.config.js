/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove output: 'export' to enable preview functionality
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
};

module.exports = nextConfig;