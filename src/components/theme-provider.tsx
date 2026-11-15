"use client";

import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { THEME_STORAGE_KEY as STORAGE_KEY, type ThemeMode } from "@/lib/theme";
export type { ThemeMode } from "@/lib/theme";
const CHANGE_EVENT = "fintrack-theme-change";
let memory: ThemeMode | undefined;
const isMode = (value: unknown): value is ThemeMode =>
  ["light", "dark", "system"].includes(String(value));

function snapshot(): ThemeMode {
  if (memory) return memory;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isMode(saved)) return saved;
  } catch {
    /* Theme still works without browser storage. */
  }
  return "system";
}
function subscribe(listener: () => void) {
  const storage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) {
      memory = undefined;
      listener();
    }
  };
  window.addEventListener("storage", storage);
  window.addEventListener(CHANGE_EVENT, listener);
  return () => {
    window.removeEventListener("storage", storage);
    window.removeEventListener(CHANGE_EVENT, listener);
  };
}
function subscribeSystem(listener: () => void) {
  const query = window.matchMedia("(prefers-color-scheme: dark)");
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}
const ThemeContext = createContext<{
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
} | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const mode = useSyncExternalStore(
    subscribe,
    snapshot,
    () => "system" as ThemeMode,
  );
  const systemDark = useSyncExternalStore(
    subscribeSystem,
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
    () => false,
  );
  useEffect(() => {
    const dark =
      mode === "dark" ||
      (mode === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [mode, systemDark]);
  function setMode(next: ThemeMode) {
    memory = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* Keep the preference in memory. */
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
  return (
    <ThemeContext.Provider value={{ mode, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
