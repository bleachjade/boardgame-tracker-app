import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cf.geekdo-images.com' }, // BGG images
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' } // Google Auth avatars
    ],
  },
};

export default nextConfig;
