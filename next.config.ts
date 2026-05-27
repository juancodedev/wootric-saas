import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Cloudflare Workers compatible - no external image optimization
    unoptimized: true,
  },
};

export default nextConfig;
