/*
 * src/components/finance-provider.tsx
 * Shares the selected month, transaction-dialog visibility, and toast message with the app. It holds temporary UI state, not financial records; API records belong to api-cache.ts.
 * "use client" marks the browser-interactive entry point: hooks/events or browser APIs
 * need JavaScript after hydration. Next may still prerender its initial HTML on the server.
 * Beginner syntax: @/ means src/ (tsconfig paths); import type is compile-time only.
 */
"use client";
// Import React hooks for local state/lifecycle/subscriptions and React types where needed. Hooks run at the component top level; type-only names disappear from the browser JavaScript.
import { createContext, useContext, useState, type ReactNode } from "react";
// Describe the UI values/functions every FinanceProvider consumer receives. (value) => void means a callback takes that value and returns no useful result.
interface FinanceContextValue {
  month: string;
  setMonth: (month: string) => void;
  notify: (message: string) => void;
  transactionOpen: boolean;
  setTransactionOpen: (open: boolean) => void;
}
const FinanceContext = createContext<FinanceContextValue | null>(null);
// A context provider makes UI values available to descendants without passing them through every intermediate component. children represents whatever React content the layout wraps.
export function FinanceProvider({ children }: { children: ReactNode }) {
  // React state stores the shared selected month (October 2024 initially, where the backend demo ledger has records). The setter (second array value) schedules a rerender when a control/event changes it; ordinary local variables would reset on each render.
  const [month, setMonth] = useState("2024-10");
  // React state stores the latest toast text; an empty string hides the notification. The setter (second array value) schedules a rerender when a control/event changes it; ordinary local variables would reset on each render.
  const [message, setMessage] = useState("");
  // React state stores whether the global Add Transaction dialog is open. The setter (second array value) schedules a rerender when a control/event changes it; ordinary local variables would reset on each render.
  const [transactionOpen, setTransactionOpen] = useState(false);
  return (
    <FinanceContext.Provider
      value={{
        month,
        setMonth,
        notify: setMessage,
        transactionOpen,
        setTransactionOpen,
      }}
    >
      {children}
      {/* Conditional JSX: render the following block only when the left-hand condition is truthy; otherwise React leaves it out. */}
      {message && (
        <div role="status" className="toast">
          <span>{message}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => setMessage("")}
          >
            ×
          </button>
        </div>
      )}
    </FinanceContext.Provider>
  );
}
// Read the nearest FinanceProvider. The guard gives a clear programming error if a caller is rendered outside the provider, instead of returning unusable null state.
export function useFinance() {
  const context = useContext(FinanceContext);
  if (!context)
    throw new Error("useFinance must be used within FinanceProvider");
  return context;
}
