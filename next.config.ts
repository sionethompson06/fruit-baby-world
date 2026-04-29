import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // src/content/episodes/*.json files are read at runtime via fs.readdirSync.
  // Vercel's static file tracer cannot detect them automatically, so we tell
  // it to include them explicitly for admin routes and the public stories page.
  outputFileTracingIncludes: {
    "/admin/episodes": ["./src/content/episodes/**/*.json"],
    "/admin/episodes/**": ["./src/content/episodes/**/*.json"],
    "/stories": ["./src/content/episodes/**/*.json"],
  },
};

export default nextConfig;
