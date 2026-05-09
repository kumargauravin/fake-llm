/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/fake-llm',
  assetPrefix: '/fake-llm/',
  trailingSlash: true,
  images: {
    unoptimized: true
  }
};

module.exports = nextConfig;
