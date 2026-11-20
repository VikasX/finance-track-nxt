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
const themeOptions: { value: ThemeMode; label: string; icon: string }[] = [
  { value: "light", label: "Light", icon: "sun" },
  { value: "dark", label: "Dark", icon: "moon" },
  { value: "system", label: "System", icon: "monitor" },
];
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
    <div className="theme-control" role="group" aria-label={label}>
      {/* Each native button supports Tab and Enter/Space. aria-pressed exposes the
          selected mode; the shared provider keeps both controls in sync. */}
      {themeOptions.map((option) => (
        <button
          key={option.value}
          type="button"
          className="theme-option"
          aria-label={`${option.label} theme`}
          aria-pressed={mode === option.value}
          title={
            option.value === "system"
              ? "System theme (follow device)"
              : `${option.label} theme`
          }
          disabled={!ready}
          onClick={() => setMode(option.value)}
        >
          <Icon name={option.icon} size={17} />
        </button>
      ))}
    </div>
  );
}
