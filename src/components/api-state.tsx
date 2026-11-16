"use client";
import type { ReactNode } from "react";
import { errorMessage } from "@/lib/api-client";
import { Button } from "./ui/primitives";
import { Icon } from "./ui/icon";
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
export function Unavailable({ children }: { children: ReactNode }) {
  return (
    <p className="info-strip text-xs">
      <Icon name="info" size={16} />
      {children}
    </p>
  );
}
