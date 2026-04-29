import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // src/content/episodes/*.json files are read at runtime via fs.readdirSync.
  // Vercel's static file tracer cannot detect them automatically, so we tell
  // it to include them explicitly for the /admin/episodes server route.
  outputFileTracingIncludes: {
    "/admin/episodes": ["./src/content/episodes/**/*.json"],
    "/admin/episodes/**": ["./src/content/episodes/**/*.json"],
  },
};

export default nextConfig;
