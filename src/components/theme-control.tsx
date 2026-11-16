"use client";
import { useSyncExternalStore } from "react";
import { useTheme, type ThemeMode } from "./theme-provider";
import { Icon } from "./ui/icon";
const subscribeHydration = () => () => {};
export function ThemeControl({ label = "Color theme" }: { label?: string }) {
  const { mode, setMode } = useTheme();
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
        onChange={(event) => setMode(event.target.value as ThemeMode)}
      >
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="system">System</option>
      </select>
    </label>
  );
}
