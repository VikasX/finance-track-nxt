/*
 * src/components/use-amount.ts
 * Returns a formatting function that follows API settings. Multiple screens reuse it; the shared cache prevents each call from downloading settings separately. Formatting is not currency conversion.
 * "use client" marks the browser-interactive entry point: hooks/events or browser APIs
 * need JavaScript after hydration. Next may still prerender its initial HTML on the server.
 * Beginner syntax: @/ means src/ (tsconfig paths); import type is compile-time only.
 */
"use client";
// Import generated response types from openapi.json. These describe API field shapes to TypeScript; they do not fetch data or validate server JSON at runtime.
import type { SettingsRead } from "@/types/api";
// Reuse the shared read cache/write flow. useApi supplies reactive request state; successful mutate calls invalidate cached data so subscribed screens refresh.
import { useApi } from "@/lib/api-cache";
/** Formatting changes presentation only; historical amounts retain their recorded currency. */
// A custom hook can return a function, not just data. Screens call this hook once at
// component level, then call the returned formatter for each amount in their JSX.
export function useAmount() {
  // Subscribe { data } to this API key. The type inside <...> describes the returned data; loading/error/retry travel with it. A changed URL selects a new cached request, and null skips the read.
  const { data } = useApi<SettingsRead>("/api/settings");
  // Read saved number_format when available, otherwise start with Indian formatting. Returning a function lets callers format many amounts using the same preference.
  const format = data?.preferences?.number_format?.toLowerCase() ?? "indian";
  return (
    value: string | number | null | undefined,
    currency = "INR",
    digits = 0,
  ) =>
    value == null
      ? "—"
      : new Intl.NumberFormat(format === "indian" ? "en-IN" : "en-US", {
          style: "currency",
          currency,
          notation: format === "compact" ? "compact" : "standard",
          minimumFractionDigits: digits,
          maximumFractionDigits: digits,
        }).format(Number(value));
}
