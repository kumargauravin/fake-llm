/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export for GitHub Pages; API routes are server-only and excluded automatically.
  // In `next dev` mode this setting is ignored, so local API routes work fine.
  output: 'export',
  basePath: '/fake-llm',
  assetPrefix: '/fake-llm/',
  trailingSlash: true,
  images: {
    unoptimized: true
  }
};

module.exports = nextConfig;
