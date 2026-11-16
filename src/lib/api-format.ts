/*
 * src/lib/api-format.ts
 * Adapts API decimal/date/category fields for display. The backend sends money as strings; total uses BigInt to add decimal strings exactly, while charts use Number conversions.
 * Beginner syntax: @/ means src/ (tsconfig paths); import type is compile-time only.
 */
// Import generated response types from openapi.json. These describe API field shapes to TypeScript; they do not fetch data or validate server JSON at runtime.
import type { CategoryRead } from "@/types/api";
// Convert a wire decimal to a number for plotting/comparison. Null becomes zero here, so callers use boundaries/display helpers where missing data must remain visibly unavailable.
export function decimal(value: string | number | null | undefined) {
  return value == null ? 0 : Number(value);
}
// Format a monetary value with Intl; missing values display a dash. This changes presentation only and performs no exchange-rate conversion.
export function amount(
  value: string | number | null | undefined,
  currency = "INR",
  digits = 0,
) {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number(value));
}
// Format a nullable percentage for display while leaving the response untouched. Null shows an unavailable marker rather than a fabricated rate.
export function percent(value: string | number | null | undefined, digits = 1) {
  return value == null ? "—" : `${Number(value).toFixed(digits)}%`;
}
/** Exact decimal addition for read-only rollups; wire strings are never overwritten. */
// Choose a common decimal scale, pad fractions, and sum integer representations using BigInt. Convert the result back to a decimal string, avoiding floating-point addition errors.
export function total(values: (string | null | undefined)[]) {
  // Derive inputs by retaining only rows that match the conditions below. filter creates a new array and leaves the original API records unchanged.
  const inputs = values.filter((value): value is string => value != null);
  // Use the largest fraction length (at least two digits) as a common scale, so every decimal can be represented as an integer before summing.
  const scale = Math.max(
    2,
    ...inputs.map((value) => value.split(".")[1]?.length ?? 0),
  );
  const sum = inputs.reduce((sum, value) => {
    const negative = value.startsWith("-");
    const [whole, fraction = ""] = value.replace(/^[+-]/, "").split(".");
    return (
      sum +
      (negative ? -BigInt(1) : BigInt(1)) *
        BigInt(whole + fraction.padEnd(scale, "0"))
    );
  }, BigInt(0));
  const negative = sum < BigInt(0);
  const digits = (negative ? -sum : sum).toString().padStart(scale + 1, "0");
  return `${negative ? "-" : ""}${digits.slice(0, -scale)}.${digits.slice(-scale)}`;
}
// Turn YYYY-MM into the first and last inclusive calendar dates used by report/transaction filters. Day zero of the next month gives the last day of the requested month.
export function monthRange(month: string) {
  // Prepare [year, m] by transforming each source item. map returns a new array; the response records remain available in their original shape.
  const [year, m] = month.split("-").map(Number);
  // Build end from calendar values. JavaScript numeric months are zero-based, so check the adjacent +1/-1 conversions when following the date flow.
  const end = new Date(year, m, 0).getDate();
  return { date_from: `${month}-01`, date_to: `${month}-${end}` };
}
// Return the next month first day; Date automatically carries December into the next year. API snapshots can use this as their as_of date.
export function nextMonth(month: string) {
  // Prepare [year, m] by transforming each source item. map returns a new array; the response records remain available in their original shape.
  const [year, m] = month.split("-").map(Number);
  // Build date from calendar values. JavaScript numeric months are zero-based, so check the adjacent +1/-1 conversions when following the date flow.
  const date = new Date(year, m, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}
// Resolve a category ID against loaded rows. Null means Uncategorized; an unresolved non-null ID stays visible as an ID instead of receiving a guessed name.
export function categoryLabel(
  categories: CategoryRead[] | undefined,
  id: number | null | undefined,
) {
  return (
    categories?.find((category) => category.id === id)?.name ??
    (id == null ? "Uncategorized" : `Category #${id}`)
  );
}
// Choose a visual icon from category-name patterns. This is presentation only; it does not reclassify or modify a transaction.
export function categoryIcon(name: string) {
  const text = name.toLowerCase();
  return /food|dining|grocer/.test(text)
    ? "restaurant"
    : /shopping|retail/.test(text)
      ? "shopping_bag"
      : /utilit|bill/.test(text)
        ? "bolt"
        : /transport|fuel|car/.test(text)
          ? "directions_car"
          : /entertain|movie/.test(text)
            ? "movie"
            : "account_balance_wallet";
}
