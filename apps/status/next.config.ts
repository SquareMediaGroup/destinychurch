import path from "node:path";
import type { NextConfig } from "next";

// Pin the project root to this folder. Otherwise Next sees the repo's root
// lockfile, treats the monorepo root as the project and picks up the main
// site's middleware and PostCSS config.
const root = path.resolve(__dirname);

const nextConfig: NextConfig = {
  poweredByHeader: false,
  turbopack: { root },
  outputFileTracingRoot: root,
};

export default nextConfig;
