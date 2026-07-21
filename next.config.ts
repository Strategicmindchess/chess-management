import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["k3nlklnm-3000.inc1.devtunnels.ms", "localhost:3000"],
    },
  },
};

export default nextConfig;
