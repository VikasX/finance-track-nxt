/*
 * src/components/theme-control.tsx
 * The shared theme picker used in the header and Settings. It reads/writes ThemeProvider, so both selectors stay in sync.
 * "use client" marks the browser-interactive entry point: hooks/events or browser APIs
 * need JavaScript after hydration. Next may still prerender its initial HTML on the server.
 * Beginner syntax: @/ means src/ (tsconfig paths); import type is compile-time only.
 */
"use client";
// Import React hooks for local state/lifecycle/subscriptions and React types where needed. Hooks run at the component top level; type-only names disappear from the browser JavaScript.
import { useSyncExternalStore } from "react";
// Use the common appearance provider so header/settings/device preference changes stay synchronized.
import { useTheme, type ThemeMode } from "./theme-provider";
// Resolve existing design icon names through the shared Lucide mapping, keeping icon rendering consistent.
import { Icon } from "./ui/icon";
const subscribeHydration = () => () => {};
// Receive an optional accessible label so the header and Settings selectors remain distinguishable. Both call the same context setter rather than separate local state.
export function ThemeControl({ label = "Color theme" }: { label?: string }) {
  // Read the shared appearance value and setter from ThemeProvider rather than maintaining a second theme preference in this control.
  const { mode, setMode } = useTheme();
  // Use different server/client snapshots to know when hydration has attached event handlers; avoid enabling a button whose click cannot yet be handled.
  const ready = useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false,
  );
  return (
    <label className="theme-control" title="Color theme">
      <Icon
        name={mode === "dark" ? "moon" : mode === "light" ? "sun" : "monitor"}
        size={17}
      />
      <select
        aria-label={label}
        disabled={!ready}
        value={mode}
        onChange={
          // Tell ThemeProvider to save and broadcast the selected appearance; it updates the document theme attribute and other selectors.
          (event) => setMode(event.target.value as ThemeMode)
        }
      >
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="system">System</option>
      </select>
    </label>
  );
}
