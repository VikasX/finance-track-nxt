"use client";
import { useTheme, type ThemeMode } from "./theme-provider";
import { Icon } from "./ui/icon";
export function ThemeControl() {
  const { mode, setMode } = useTheme();
  return (
    <label className="theme-control" title="Color theme">
      <Icon
        name={mode === "dark" ? "moon" : mode === "light" ? "sun" : "monitor"}
        size={17}
      />
      <select
        aria-label="Color theme"
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
