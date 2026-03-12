import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/**": ["./app/api/chat/system.md"],
  },
};

export default nextConfig;
