import type { FinanceState } from "@/types/finance";
import { initialState } from "./mock-data";
function matchesShape(value: unknown, template: unknown): boolean {
  if (template === null)
    return value === null || (typeof value === "object" && value !== null);
  if (Array.isArray(template))
    return (
      Array.isArray(value) &&
      (template.length === 0 ||
        value.every((item) => matchesShape(item, template[0])))
    );
  if (typeof template === "object")
    return (
      typeof value === "object" &&
      value !== null &&
      Object.entries(template).every(([key, field]) =>
        matchesShape((value as Record<string, unknown>)[key], field),
      )
    );
  return (
    typeof value === typeof template &&
    (typeof value !== "number" || Number.isFinite(value))
  );
}
export function validateBackup(value: unknown): value is FinanceState {
  if (!matchesShape(value, initialState)) return false;
  const data = value as FinanceState;
  const collections = [
    data.transactions,
    data.budgets,
    data.holdings,
    data.deposits,
    data.loans,
    data.contributions,
    data.goals,
    data.events,
  ];
  if (
    !collections.every(
      (collection) =>
        new Set(collection.map((item) => item.id)).size === collection.length,
    )
  )
    return false;
  return (
    data.transactions.every(
      (t) =>
        t.amount >= 0 &&
        ["income", "expense", "investment", "loan"].includes(t.kind) &&
        /^\d{4}-\d{2}-\d{2}$/.test(t.date),
    ) &&
    data.budgets.every((b) => b.limit > 0) &&
    data.holdings.every(
      (h) =>
        h.quantity >= 0 &&
        h.buyPrice >= 0 &&
        h.price >= 0 &&
        ["Stock", "Mutual Fund"].includes(h.kind),
    ) &&
    data.deposits.every(
      (d) => d.principal > 0 && d.rate >= 0 && d.maturityDate > d.startDate,
    ) &&
    data.loans.every((l) => l.principal > 0 && l.emi > 0) &&
    data.contributions.every((c) => c.amount > 0) &&
    data.goals.every((g) => g.target > 0 && g.saved >= 0) &&
    data.events.every(
      (e) => e.amount >= 0 && /^\d{4}-\d{2}-\d{2}$/.test(e.date),
    ) &&
    data.preferences.notifications.length === 4
  );
}
