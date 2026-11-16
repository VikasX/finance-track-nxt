/*
 * next.config.ts
 * Next.js build/runtime settings. This project enables component caching/prefetching and sends CSS through the installed Tailwind Turbopack loader; comments here do not change deployment settings.
 * Beginner syntax: @/ means src/ (tsconfig paths); import type is compile-time only.
 */
// Import Next.js framework types/helpers for server metadata, configuration, or route request handling; these are not backend database connections.
import type { NextConfig } from "next";

// Typed build configuration exported for Next.js to read; its options are infrastructure settings, not component props.
const nextConfig: NextConfig = {
  /* config options here */
  // Preserve the existing Next component-caching feature. Live financial fetches still use no-store in the HTTP/proxy layer.
  cacheComponents: true,
  // Preserve the existing route prefetching setting; navigation can prepare route content before a click.
  partialPrefetching: true,
  // Tell the bundler how to process existing CSS files with the installed Tailwind loader. Changing this would affect build/styling, so the explanation pass leaves values intact.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
