import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root — a stray lockfile higher up (Desktop) otherwise confuses Turbopack.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
