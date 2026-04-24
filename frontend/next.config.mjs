import pkg from "./package.json" with { type: "json" };

// Derive CSP-safe origins from the S3/CDN env vars so the config follows the
// actual bucket (any region) or a CloudFront distribution without edits.
function originFromEnv(value) {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

const datasetOrigins = [
  originFromEnv(process.env.AWS_S3_BUCKET_URL),
  originFromEnv(process.env.AWS_CDN_URL),
].filter(Boolean);

const connectSrc = [
  "'self'",
  "https://app.posthog.com",
  "https://*.posthog.com",
  "https://strapi.odyssey.khoury.northeastern.edu",
  "https://emkc.org",
  "https://cdn.jsdelivr.net",
  "https://*.codesandbox.io",
  ...datasetOrigins,
].join(" ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
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
      dynamic: 0,
      static: 180,
    },
    serverActions: {
      bodySizeLimit: "30mb",
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
              connect-src ${connectSrc};
              style-src 'self' 'unsafe-inline';
              img-src 'self' data: https: blob:;
              font-src 'self' data:;
              media-src 'self' https: blob:;
              worker-src 'self' blob:;
              child-src 'self' https://www.youtube.com https://player.vimeo.com https://*.codesandbox.io;
              frame-src 'self' https://www.youtube.com https://player.vimeo.com https://*.codesandbox.io;
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
