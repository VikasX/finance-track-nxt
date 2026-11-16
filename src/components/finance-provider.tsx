"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
interface FinanceContextValue {
  month: string;
  setMonth: (month: string) => void;
  notify: (message: string) => void;
  transactionOpen: boolean;
  setTransactionOpen: (open: boolean) => void;
}
const FinanceContext = createContext<FinanceContextValue | null>(null);
export function FinanceProvider({ children }: { children: ReactNode }) {
  const [month, setMonth] = useState("2024-10");
  const [message, setMessage] = useState("");
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
export function useFinance() {
  const context = useContext(FinanceContext);
  if (!context)
    throw new Error("useFinance must be used within FinanceProvider");
  return context;
}
