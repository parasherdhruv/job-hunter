import type { NextConfig } from 'next';

/**
 * The browser always talks to `/api/*` on the Next.js origin. Next proxies those
 * requests to the NestJS API, which keeps the session cookie first-party and
 * removes the need for CORS in the default deployment.
 *
 * Set `API_PROXY_TARGET` to the backend origin (e.g. the Railway API URL).
 */
const apiTarget = process.env.API_PROXY_TARGET ?? 'http://localhost:4000';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${apiTarget}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
