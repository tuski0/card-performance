import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Another lockfile exists higher up on this machine; pin the project root.
  turbopack: { root: path.resolve(__dirname) },
};

export default nextConfig;
