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
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://clerk.firstchapter.ai https://*.clerk.accounts.dev",
              "connect-src 'self' https://firstchapterai-production.up.railway.app https://api.firstchapter.ai https://*.clerk.accounts.dev https://*.supabase.co wss://*.clerk.accounts.dev",
              "img-src 'self' data: blob: https:",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "frame-src 'self' https://*.clerk.accounts.dev",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;