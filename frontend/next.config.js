/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output bundles only required files — dramatically reduces
  // the Docker image size and speeds up builds (no full node_modules copy).
  output: 'standalone',

  // Allow external image domains (thumbnails from YouTube, Instagram, FB)
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'i.ytimg.com' },
      { protocol: 'https', hostname: '*.ytimg.com' },
      { protocol: 'https', hostname: '*.cdninstagram.com' },
      { protocol: 'https', hostname: 'scontent*.fbcdn.net' },
      { protocol: 'https', hostname: '*.fbcdn.net' },
    ],
    formats: ['image/avif', 'image/webp'],
  },

  // NOTE: /api/* proxying is handled by src/app/api/[...path]/route.ts
  // That Route Handler runs at REQUEST time and reads BACKEND_URL from the
  // live process env — correctly resolving http://backend:4000 in Docker
  // and the Railway service URL in production.
  // DO NOT add a rewrites() block here — it runs at BUILD time and bakes
  // in whatever BACKEND_URL resolves to during the image build (usually
  // nothing, falling back to localhost:4000 → ECONNREFUSED).

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options',        value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy',         value: 'strict-origin-when-cross-origin' },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },

  compress:       true,
  poweredByHeader: false,
};

module.exports = nextConfig;
