import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@aegispay/shared-types'],
  // @ts-ignore
  allowedDevOrigins: [
    '3000-cs-441998344505-default.cs-asia-southeast1-seal.cloudshell.dev',
    '*.cs-asia-southeast1-seal.cloudshell.dev',
    '*.cloudshell.dev',
  ],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    // Handled natively by Next.js App Router route handlers in /api/buyer/*
    // with graceful fallbacks to eliminate proxy ECONNREFUSED errors on Render.
    return [];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.paypal.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https: https://*.trychannel3.com https://cdn.trychannel3.com https://*.channel3.ai; font-src 'self' data:; connect-src 'self' https://*.paypal.com https://*.channel3.ai https://*.trychannel3.com https://api.trychannel3.com wss:; frame-ancestors 'none';",
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
