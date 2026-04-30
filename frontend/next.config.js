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
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' blob: https://*.clerk.accounts.dev https://clerk.firstchapter.ai https://challenges.cloudflare.com https://checkout.razorpay.com",
              "worker-src 'self' blob:",
              "connect-src 'self' blob: https://firstchapterai-production.up.railway.app https://api.firstchapter.ai https://*.clerk.accounts.dev wss://*.clerk.accounts.dev https://*.supabase.co",
              "img-src 'self' data: blob: https:",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' data: https://fonts.gstatic.com",
              "frame-src 'self' https://*.clerk.accounts.dev https://challenges.cloudflare.com https://api.razorpay.com",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
