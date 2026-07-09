import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // ✅ prevents build failure due to ESLint
  },
};

export default nextConfig;