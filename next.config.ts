import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // proxy.ts buffers the request body for both the proxy auth check and the
    // downstream route handler. The default 10 MB limit truncates large video
    // uploads, leaving the multipart parser waiting for a boundary that never
    // arrives. 200 MB covers typical short teaser clips without excess memory cost.
    proxyClientMaxBodySize: "200mb",
  },
  // src/content/episodes/*.json files are read at runtime via fs.readdirSync.
  // Vercel's static file tracer cannot detect them automatically, so we tell
  // it to include them explicitly for admin routes and public story pages.
  outputFileTracingIncludes: {
    "/admin/episodes": ["./src/content/episodes/**/*.json"],
    "/admin/episodes/**": ["./src/content/episodes/**/*.json"],
    "/stories": ["./src/content/episodes/**/*.json"],
    "/stories/**": ["./src/content/episodes/**/*.json"],
    "/characters": ["./src/content/characters/**/*.json"],
    "/characters/**": ["./src/content/characters/**/*.json"],
    "/admin/characters": ["./src/content/characters/**/*.json"],
    "/admin/characters/**": ["./src/content/characters/**/*.json"],
    "/": ["./src/content/site/**/*.json"],
    "/shop": ["./src/content/shop/**/*.json"],
    "/admin/products": ["./src/content/shop/**/*.json"],
  },
};

export default nextConfig;
