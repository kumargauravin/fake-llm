/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/fake-llm',
  assetPrefix: '/fake-llm/',
  trailingSlash: true,
  images: {
    unoptimized: true
  }
};

module.exports = nextConfig;
