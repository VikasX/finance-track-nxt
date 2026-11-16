/*
 * src/components/theme-provider.tsx
 * Shares light/dark/system appearance and listens for changes in other tabs and in the operating system. It updates the root data-theme attribute consumed by globals.css.
 * "use client" marks the browser-interactive entry point: hooks/events or browser APIs
 * need JavaScript after hydration. Next may still prerender its initial HTML on the server.
 * Beginner syntax: @/ means src/ (tsconfig paths); import type is compile-time only.
 */
"use client";

// Import React hooks for local state/lifecycle/subscriptions and React types where needed. Hooks run at the component top level; type-only names disappear from the browser JavaScript.
import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";

// Import the shared appearance contract/startup script so the initial HTML and interactive provider agree on the same storage key and modes.
import { THEME_STORAGE_KEY as STORAGE_KEY, type ThemeMode } from "@/lib/theme";
export type { ThemeMode } from "@/lib/theme";
// A custom same-tab event complements the native storage event, which is sent to other browser tabs.
const CHANGE_EVENT = "fintrack-theme-change";
// Keep appearance usable even if browser storage is unavailable. Financial data is not stored in this theme fallback.
let memory: ThemeMode | undefined;
const isMode = (value: unknown): value is ThemeMode =>
  ["light", "dark", "system"].includes(String(value));

// Read the in-memory preference first, then browser storage, and fall back to system. Storage can throw in restricted browsers, so failure must not prevent rendering.
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
// Notify React when another tab changes storage or this tab dispatches its custom theme event. Return an unsubscribe function so React can remove listeners when the subscription ends.
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
// Listen to OS appearance changes through matchMedia. The returned cleanup removes the exact same callback, avoiding accumulated listeners.
function subscribeSystem(listener: () => void) {
  // Create the browser media-query object for OS dark-mode changes. Its change listener is removed by the cleanup returned below.
  const query = window.matchMedia("(prefers-color-scheme: dark)");
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}
const ThemeContext = createContext<{
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
} | null>(null);

// Subscribe React to browser theme state, then synchronize the document attribute after changes. The server snapshots give hydration a predictable starting value.
export function ThemeProvider({ children }: { children: ReactNode }) {
  // Subscribe mode to a store outside React state. The subscribe callback supplies cleanup, while client/server snapshots keep rendering and hydration consistent.
  // The first callback subscribes; snapshot reads browser state; the final function is the stable server/hydration fallback. React keeps external store changes in sync.
  const mode = useSyncExternalStore(
    subscribe,
    snapshot,
    () => "system" as ThemeMode,
  );
  // Subscribe systemDark to a store outside React state. The subscribe callback supplies cleanup, while client/server snapshots keep rendering and hydration consistent.
  const systemDark = useSyncExternalStore(
    subscribeSystem,
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
    () => false,
  );
  // Run this side effect after rendering when its dependency values change. Any returned function cleans up the previous timer/listener/DOM change before rerunning or unmounting.
  useEffect(() => {
    const dark =
      mode === "dark" ||
      (mode === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  // Run again if the saved preference or OS theme changes. Explicit light/dark takes priority; system follows matchMedia. This effect adds no listener, so it needs no cleanup.
  }, [mode, systemDark]);
  // Store the chosen mode, attempt device persistence, then notify same-tab subscribers. The storage event alone only notifies other tabs.
  function setMode(next: ThemeMode) {
    memory = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* Keep the preference in memory. */
    }
    // Native storage events do not fire in the tab that changed storage. Notify this tab explicitly so every selector rerenders.
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
  return (
    <ThemeContext.Provider value={{ mode, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}
// Expose the shared mode/setMode pair to selectors; reject calls outside ThemeProvider so configuration mistakes are explicit.
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
