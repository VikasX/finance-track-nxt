import type { CategoryRead } from "@/types/api";
export function decimal(value: string | number | null | undefined) {
  return value == null ? 0 : Number(value);
}
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
export function percent(value: string | number | null | undefined, digits = 1) {
  return value == null ? "—" : `${Number(value).toFixed(digits)}%`;
}
/** Exact decimal addition for read-only rollups; wire strings are never overwritten. */
export function total(values: (string | null | undefined)[]) {
  const inputs = values.filter((value): value is string => value != null);
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
export function monthRange(month: string) {
  const [year, m] = month.split("-").map(Number);
  const end = new Date(year, m, 0).getDate();
  return { date_from: `${month}-01`, date_to: `${month}-${end}` };
}
export function nextMonth(month: string) {
  const [year, m] = month.split("-").map(Number);
  const date = new Date(year, m, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}
export function categoryLabel(
  categories: CategoryRead[] | undefined,
  id: number | null | undefined,
) {
  return (
    categories?.find((category) => category.id === id)?.name ??
    (id == null ? "Uncategorized" : `Category #${id}`)
  );
}
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
