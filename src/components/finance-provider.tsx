"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { initialState } from "@/lib/mock-data";
import type { Collection, FinanceState } from "@/types/finance";

const STORAGE_KEY = "fintrack-demo-v1";
const serverSnapshot = JSON.stringify(initialState);
let memory: string | null = null;
const listeners = new Set<() => void>();
function subscribe(listener: () => void) {
  listeners.add(listener);
  const syncStorage = () => {
    memory = null;
    listener();
  };
  window.addEventListener("storage", syncStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", syncStorage);
  };
}
function getSnapshot() {
  if (memory !== null) return memory;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return saved;
  } catch {
    /* In private browsing the in-memory store remains available. */
  }
  return memory ?? serverSnapshot;
}
function write(state: FinanceState) {
  memory = JSON.stringify(state);
  try {
    localStorage.setItem(STORAGE_KEY, memory);
  } catch {
    /* Keep working when browser storage is unavailable. */
  }
  listeners.forEach((listener) => listener());
}
function parseState(snapshot: string): FinanceState {
  try {
    const parsed = JSON.parse(snapshot);
    if (
      Array.isArray(parsed.transactions) &&
      Array.isArray(parsed.budgets) &&
      parsed.preferences
    )
      return { ...initialState, ...parsed };
  } catch {
    /* Recover from an invalid local snapshot. */
  }
  return initialState;
}
interface FinanceContextValue {
  state: FinanceState;
  month: string;
  setMonth: (month: string) => void;
  update: (fn: (state: FinanceState) => FinanceState) => void;
  remove: (collection: Collection, id: string) => void;
  notify: (message: string) => void;
  transactionOpen: boolean;
  setTransactionOpen: (open: boolean) => void;
}
const FinanceContext = createContext<FinanceContextValue | null>(null);
export function FinanceProvider({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => serverSnapshot,
  );
  const state = useMemo(() => parseState(snapshot), [snapshot]);
  const [month, setMonth] = useState("2024-10");
  const [message, setMessage] = useState("");
  const [transactionOpen, setTransactionOpen] = useState(false);
  function notify(text: string) {
    setMessage(text);
  }
  function update(fn: (current: FinanceState) => FinanceState) {
    write(fn(parseState(getSnapshot())));
  }
  function remove(collection: Collection, id: string) {
    update((current) => ({
      ...current,
      [collection]: current[collection].filter((item) => item.id !== id),
    }));
    notify("Record deleted.");
  }
  return (
    <FinanceContext.Provider
      value={{
        state,
        month,
        setMonth,
        update,
        remove,
        notify,
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
