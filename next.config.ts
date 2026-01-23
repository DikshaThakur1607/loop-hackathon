import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Empty turbopack config to silence the webpack warning
  turbopack: {},
};

export default nextConfig;
