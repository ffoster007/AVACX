import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Using remotePatterns for fine-grained control and future flexibility
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
