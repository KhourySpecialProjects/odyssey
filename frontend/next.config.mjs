/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      "localhost",
      "strapi.odyssey.khoury.northeastern.edu",
      "odyssey.khoury.northeastern.edu",
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000"],
    },
  },
  headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `
              default-src 'self';
              script-src 'self' 'unsafe-inline' 'unsafe-eval' https://us-assets.i.posthog.com https://cdn.jsdelivr.net;
              connect-src 'self' https://app.posthog.com https://*.posthog.com;
              style-src 'self' 'unsafe-inline';
              img-src 'self' data: https: blob:;
              font-src 'self' data:;
              media-src 'self' https: blob:;
              worker-src 'self' blob:;
              child-src 'self' https://www.youtube.com https://player.vimeo.com;
              frame-src 'self' https://www.youtube.com https://player.vimeo.com;
            `
              .replace(/\s{2,}/g, " ")
              .trim(),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
