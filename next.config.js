/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
  images: {
    domains: ['images.clerk.dev', 'img.clerk.com'],
  },
};

module.exports = nextConfig;
