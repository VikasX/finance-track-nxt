"use client";
import type { SettingsRead } from "@/types/api";
import { useApi } from "@/lib/api-cache";
/** Formatting changes presentation only; historical amounts retain their recorded currency. */
export function useAmount() {
  const { data } = useApi<SettingsRead>("/api/settings");
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
