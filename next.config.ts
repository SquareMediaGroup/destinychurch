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
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            // Stops other sites framing ours (clickjacking); same-origin
            // framing (e.g. admin previews) keeps working.
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
      // Long-lived cache for static media in /public (PageSpeed flagged 5-minute
      // TTL on vercel.app). File names would need to change when the image does,
      // but for branded backgrounds this is fine.
      {
        source: "/img/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/og/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/fonts/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
  images: {
    minimumCacheTTL: 2592000, // 30 days
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.ytimg.com",
      },
      {
        protocol: "https",
        hostname: "storage.buzzsprout.com",
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
        hostname: "**.destinytees.uk",
      },
      {
        protocol: "https",
        hostname: "cdn.churchsuite.com",
      },
      {
        protocol: "https",
        hostname: "lwmnrbglbtbyypzcenzf.supabase.co",
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
