/*
 * src/app/income-expenses/page.tsx
 * Next.js makes the containing folder a URL route. This small Server Component exports metadata and renders the interactive screen from components/pages; keeping the route wrapper small separates routing from UI behavior.
 * Beginner syntax: @/ means src/ (tsconfig paths); import type is compile-time only.
 */
// Import Next.js framework types/helpers for server metadata, configuration, or route request handling; these are not backend database connections.
import type { Metadata } from "next";
// Import the Suspense rendering boundary for the URL-dependent transaction screen.
// It provides temporary content without making this route wrapper a Client Component.
import { Suspense } from "react";
// Import the interactive screen implementation for this route; the route wrapper owns the URL/title while the screen owns data and UI events.
import { Transactions } from "@/components/pages/transactions";
// Next.js uses this server export for browser title/description. The template applies consistent branding to nested route titles.
export const metadata: Metadata = { title: "Income & Expenses" };
// Render the screen for this route. This wrapper remains a Server Component; the imported screen declares its own client boundary.
export default function Page() {
  return (
    // useSearchParams in the client screen can suspend during prerendering. This boundary provides temporary route content until that URL-dependent subtree is ready.
    <Suspense fallback={<div className="card">Loading transactions…</div>}>
      <Transactions />
    </Suspense>
  );
}
