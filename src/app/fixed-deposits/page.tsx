/*
 * src/app/fixed-deposits/page.tsx
 * Next.js makes the containing folder a URL route. This small Server Component exports metadata and renders the interactive screen from components/pages; keeping the route wrapper small separates routing from UI behavior.
 * Beginner syntax: @/ means src/ (tsconfig paths); import type is compile-time only.
 */
// Import Next.js framework types/helpers for server metadata, configuration, or route request handling; these are not backend database connections.
import type { Metadata } from "next";
// Import the interactive screen implementation for this route; the route wrapper owns the URL/title while the screen owns data and UI events.
import { Deposits } from "@/components/pages/deposits";
// Next.js uses this server export for browser title/description. The template applies consistent branding to nested route titles.
export const metadata: Metadata = { title: "Fixed Deposits" };
// Render the screen for this route. This wrapper remains a Server Component; the imported screen declares its own client boundary.
export default function Page() {
  return <Deposits />;
}
