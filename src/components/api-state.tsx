/*
 * src/components/api-state.tsx
 * Standalone loading/error/empty display helpers. The active screen flow mainly uses ui/api-boundary.tsx; keep that distinction in mind when tracing requests.
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
import { Button } from "./ui/primitives";
// Resolve existing design icon names through the shared Lucide mapping, keeping icon rendering consistent.
import { Icon } from "./ui/icon";
// Alternate explicit state wrapper: error takes precedence, then loading, then content. Most page components use ui/api-boundary.tsx instead, so start there for the active data flow.
export function ApiState({
  loading,
  error,
  retry,
  children,
}: {
  loading: boolean;
  error?: unknown;
  retry: () => void;
  children?: ReactNode;
}) {
  if (error)
    return (
      <section className="card api-error" role="alert">
        <Icon name="warning" size={25} />
        <h2>Unable to load this data</h2>
        <p className="muted">{errorMessage(error)}</p>
        <Button onClick={retry} icon="autorenew">
          Retry
        </Button>
      </section>
    );
  if (loading)
    return (
      <section
        className="card api-loading"
        role="status"
        aria-label="Loading financial data"
      >
        <span className="loading-spinner" />
        <p>Loading financial data…</p>
      </section>
    );
  return children;
}
// Render a provided explanation for a contract limitation. This is deliberate unavailable content rather than a fake successful backend action.
export function Unavailable({ children }: { children: ReactNode }) {
  return (
    <p className="info-strip text-xs">
      <Icon name="info" size={16} />
      {children}
    </p>
  );
}
