import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Exclude Backend folder from build
  webpack: (config) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/Backend/**', '**/node_modules/**'],
    };
    return config;
  },
};

export default nextConfig;
