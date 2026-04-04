import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "*": ["node_modules/ffmpeg-static/ffmpeg"],
  },
  async redirects() {
    return [
      {
        source: "/prayer-request",
        destination: "/connect-card",
        permanent: true,
      },
      {
        source: "/prayer-requests",
        destination: "/connect-card",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
  images: {
    minimumCacheTTL: 300,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.ytimg.com",
      },
      {
        protocol: "https",
        hostname: "media.destiny.example.com",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "destinytees.uk",
      },
      {
        protocol: "https",
        hostname: "**.churchsuite.com",
      },
      {
        protocol: "https",
        hostname: "**.churchsuite.co.uk",
      },
    ],
  },
};

export default nextConfig;
