"use client";
import type { ReactNode } from "react";
import { errorMessage } from "@/lib/api-client";
import { Button } from "./primitives";
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
      {query.loading && (
        <p role="status" className="refresh-status">
          Refreshing…
        </p>
      )}
      {children}
    </>
  );
}
