/*
 * src/app/page.tsx
 * The home route renders the same Dashboard component as /dashboard; it does not redirect or change the URL. Next.js uses this page.tsx file for the URL /; the dashboard screen itself lives in components/pages/dashboard.tsx.
 * Beginner syntax: @/ means src/ (tsconfig paths); import type is compile-time only.
 */
// Import the interactive screen implementation for this route; the route wrapper owns the URL/title while the screen owns data and UI events.
import { Dashboard } from "@/components/pages/dashboard";
// Render the screen for this route. This wrapper remains a Server Component; the imported screen declares its own client boundary.
export default function Page() {
  return <Dashboard />;
}
