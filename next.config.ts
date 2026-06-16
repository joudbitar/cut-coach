import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Progress photos from a phone camera can exceed the 1MB Server Action
    // default. We also downscale client-side, but keep headroom here.
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
