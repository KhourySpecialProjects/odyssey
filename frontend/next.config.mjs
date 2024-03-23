/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    deviceSizes: [320, 420, 768, 1024, 1200],
    loader: "default",
    domains: [process.env.DO_CDN_URL],
  },
  transpilePackages: ["lucide-react"],
};

export default nextConfig;
