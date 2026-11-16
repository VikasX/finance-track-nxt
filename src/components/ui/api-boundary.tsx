/*
 * src/components/ui/api-boundary.tsx
 * Turns a useApi result into loading, failure/retry, background-refresh, or normal content. It is a display wrapper, not a React exception-catching Error Boundary.
 * "use client" marks the browser-interactive entry point: hooks/events or browser APIs
 * need JavaScript after hydration. Next may still prerender its initial HTML on the server.
 * Beginner syntax: @/ means src/ (tsconfig paths); import type is compile-time only.
 */
"use client";
// Import React hooks for local state/lifecycle/subscriptions and React types where needed. Hooks run at the component top level; type-only names disappear from the browser JavaScript.
import type { ReactNode } from "react";
// Reuse URL, HTTP, or error helpers instead of duplicating fetch/parsing rules in this file. Browser /api paths are forwarded by the Next proxy.
import { errorMessage } from "@/lib/api-client";
// Import the shared styled UI pieces rather than repeating button/card/dialog/form markup. Their props let this screen supply content and event callbacks.
import { Button } from "./primitives";
// Inspect the query before rendering children. Initial loading and failure replace the content; successful background refresh can keep the last data visible.
export function ApiBoundary({
  query,
  children,
}: {
  query: {
    data?: unknown;
    error?: unknown;
    loading: boolean;
    retry: () => void;
  };
  children: ReactNode;
}) {
  if (query.error)
    return (
      <section className="card api-state" role="alert">
        <h2>Couldn’t load your data</h2>
        <p className="muted">{errorMessage(query.error)}</p>
        <Button icon="autorenew" onClick={query.retry}>
          Retry
        </Button>
      </section>
    );
  if (query.data === undefined)
    return (
      <section
        className="card api-state"
        role="status"
        aria-label="Loading financial data"
      >
        <div className="loading-spinner" />
        <p className="muted">Loading financial data…</p>
      </section>
    );
  return (
    <>
      {/* Conditional JSX: render the following block only when the left-hand condition is truthy; otherwise React leaves it out. */}
      {query.loading && (
        <p role="status" className="refresh-status">
          Refreshing…
        </p>
      )}
      {children}
    </>
  );
}
