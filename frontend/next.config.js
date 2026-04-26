/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "connect-src 'self' https://firstchapterai-production.up.railway.app https://api.firstchapter.ai https://*.clerk.accounts.dev wss://*.clerk.accounts.dev https://*.supabase.co; default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.clerk.accounts.dev; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; frame-src https://*.clerk.accounts.dev;",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;