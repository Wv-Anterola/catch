import type { NextConfig } from "next";

// Static export: every page is prerendered from the committed JSON bundle, so the site
// runs with no server on Vercel or GitHub Pages. basePath is "" for root hosting and
// "/<repo>" for a GitHub project page; lib/paths.ts reads the same var for data fetches.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  images: { unoptimized: true },
};

export default nextConfig;
