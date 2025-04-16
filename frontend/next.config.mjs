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
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' https://app.posthog.com https://*.posthog.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
