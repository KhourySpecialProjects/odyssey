/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has type errors.
    // ignoreBuildErrors: true, // Uncomment if you also want to ignore TypeScript errors
  },
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
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        "dev2.khouryodyssey.org",
        "www.khouryodyssey.org",
      ],
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
              connect-src 'self' https://app.posthog.com https://*.posthog.com https://strapi.odyssey.khoury.northeastern.edu https://emkc.org;
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
