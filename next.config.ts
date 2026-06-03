import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import type { NextConfig } from "next";

initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  serverExternalPackages: [
    "@react-pdf/renderer",
    "@supabase/supabase-js",
    "drizzle-orm",
    "pg",
    "pino",
    "exceljs",
  ],
};

export default nextConfig;
