/*
 * tests/api-fixture.ts
 * Intercepts browser /api requests with contract-shaped test data. Every test gets an isolated copy and a log of writes, so browser tests never mutate the deployed account.
 * Beginner syntax: @/ means src/ (tsconfig paths); import type is compile-time only.
 */
// Import the existing Playwright test/assertion tools (or browser Page type). Assertions wait for UI conditions rather than assuming rendering is immediate.
import type { Page } from "@playwright/test";
// Use isolated contract-shaped fixtures for tests; these records never replace real API data in the running application.
import fixture from "./fixtures/api.json";
// Import generated writable-field metadata. It prevents forms/tests from accidentally submitting read-only response fields.
import { writeContracts } from "../src/lib/api-contract";
// A dictionary-shaped test record: string keys with unknown values. Test helpers narrow/assert fields before using them.
type Row = Record<string, unknown>;
// Clone fixture data per test, intercept HTTP calls, and return a writes log for payload assertions. Nothing in this helper is imported by production screens.
export async function mockApi(page: Page) {
  const data = structuredClone(fixture) as unknown as Record<string, unknown>;
  // Prepare collections by transforming each source item. map returns a new array; the response records remain available in their original shape.
  const collections = Object.fromEntries(
    [
      "transactions",
      "categories",
      "budgets",
      "loans",
      "investments",
      "fixed-deposits",
      "ppf",
      "savings-goals",
      "reminders",
    ].map((key) => [key, (data[key] as { items: Row[] }).items]),
  );
  const writes: { method: string; path: string; body: Row }[] = [];
  let nextId = 1000;
  // Reproduce the collection envelope expected by the UI so browser tests exercise server pagination rather than receiving the entire array.
  function paginate(items: Row[], url: URL) {
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
    const size = Number(url.searchParams.get("page_size") ?? 50);
    return {
      items: items.slice((page - 1) * size, page * size),
      total: items.length,
      page,
      page_size: size,
    };
  }
  // Recalculate fixture cash-flow totals after test transactions change, allowing assertions that successful writes refresh dashboard/report views.
  function cash() {
    const tx = collections.transactions;
    // Derive sum by retaining only rows that match the conditions below. filter creates a new array and leaves the original API records unchanged.
    const sum = (kind: string) =>
      tx
        .filter((t) => t.transaction_type === kind)
        .reduce((sum, t) => sum + Number(t.amount), 0);
    const income = sum("income"),
      expenses = sum("expense"),
      investment = sum("investment"),
      loan = sum("loan_payment");
    return {
      income: income.toFixed(2),
      expenses: expenses.toFixed(2),
      investment_outflow: investment.toFixed(2),
      loan_payments: loan.toFixed(2),
      transfers: sum("transfer").toFixed(2),
      total_outflow: (expenses + investment + loan).toFixed(2),
      net_cash_flow: (income - expenses - investment - loan).toFixed(2),
      savings_rate_percent: income
        ? (((income - expenses) / income) * 100).toFixed(2)
        : null,
      transaction_count: tx.length,
    };
  }
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    // Derive parts by retaining only rows that match the conditions below. filter creates a new array and leaves the original API records unchanged.
    const parts = path.split("/").filter(Boolean);
    const resource = parts[1];
    const method = request.method();
    const json = (body: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    if (method !== "GET") {
      const body = (request.postDataJSON() ?? {}) as Row;
      writes.push({ method, path, body });
      const contractPath =
        resource === "ppf" && parts[3] === "contributions"
          ? "/api/ppf/{record_id}/contributions"
          : `/api/${resource}`;
      // Look up writable-field rules generated from OpenAPI. The type assertion describes that metadata to TypeScript; it does not validate runtime data.
      const contract = (
        writeContracts as unknown as Record<string, { fields: Row }>
      )[contractPath];
      if (
        resource !== "settings" &&
        Object.keys(body).some((key) => !contract?.fields[key])
      )
        return json({ detail: "Unexpected field in write payload" }, 422);
      if (resource === "settings") {
        const s = data.settings as { profile: Row; preferences: Row };
        for (const [key, value] of Object.entries(body))
          if (["name", "email"].includes(key)) s.profile[key] = value;
          else s.preferences[key] = value;
        return json(s);
      }
      const contribution = resource === "ppf" && parts[3] === "contributions";
      const items = contribution
        ? (data.contributions as Row[])
        : collections[resource];
      const id = Number(parts[contribution ? 4 : 2]);
      if (method === "POST") {
        const record: Row = {
          ...structuredClone(items[0] ?? {}),
          ...body,
          id: nextId++,
          user_id: 1,
        };
        if (contribution) {
          record.ppf_account_id = Number(parts[2]);
          const account = collections.ppf.find(
            (r) => r.id === Number(parts[2]),
          );
          if (account)
            account.current_balance = (
              Number(account.current_balance) + Number(body.amount)
            ).toFixed(2);
        }
        if (resource === "transactions") {
          record.category_id ??= null;
          record.notes ??= null;
          record.reference_code ??= null;
          record.payment_method ??= null;
        }
        items.unshift(record);
        return json(record, 201);
      }
      const index = items.findIndex((item) => item.id === id);
      if (index < 0) return json({ detail: "Not found" }, 404);
      if (method === "PATCH") {
        if (contribution) {
          const account = collections.ppf.find(
            (r) => r.id === Number(parts[2]),
          );
          if (account && body.amount)
            account.current_balance = (
              Number(account.current_balance) -
              Number(items[index].amount) +
              Number(body.amount)
            ).toFixed(2);
        }
        items[index] = { ...items[index], ...body };
        return json(items[index]);
      }
      if (method === "DELETE") {
        items.splice(index, 1);
        return route.fulfill({ status: 204 });
      }
    }
    if (resource === "settings") return json(data.settings);
    if (resource === "dashboard") {
      // Clone the starting dashboard before overlaying totals from this test's writes.
      // Keep the source fixture unchanged so later cases start from the same data.
      const base = structuredClone(data.dashboard) as Row;
      const totals = cash();
      base.cash_flow = totals;
      base.income = totals.income;
      base.expenses = totals.expenses;
      base.balance = totals.net_cash_flow;
      base.recent_transactions = collections.transactions.slice(0, 6);
      base.month = url.searchParams.get("month");
      return json(base);
    }
    if (resource === "reports") {
      if (parts[2] === "summary")
        return json({ ...(data.summary as object), totals: cash() });
      if (parts[2] === "monthly") return json(data.monthly);
      return json(data.categoryReport);
    }
    if (resource === "ppf" && parts[3] === "contributions")
      return json(data.contributions);
    if (resource === "ppf" && parts[3] === "interest")
      return json(data.interest);
    if (resource === "loans" && parts[3] === "amortization")
      return json(data.amortization);
    let items = [...(collections[resource] ?? [])];
    if (resource === "transactions") {
      const search = url.searchParams.get("search")?.toLowerCase();
      items = items.filter(
        (r) =>
          (!search ||
            `${r.description} ${r.notes ?? ""}`
              .toLowerCase()
              .includes(search)) &&
          (!url.searchParams.get("transaction_type") ||
            r.transaction_type === url.searchParams.get("transaction_type")) &&
          (!url.searchParams.get("category_id") ||
            String(r.category_id) === url.searchParams.get("category_id")) &&
          (!url.searchParams.get("payment_method") ||
            r.payment_method === url.searchParams.get("payment_method")) &&
          (!url.searchParams.get("date_from") ||
            String(r.transaction_date) >= url.searchParams.get("date_from")!) &&
          (!url.searchParams.get("date_to") ||
            String(r.transaction_date) <= url.searchParams.get("date_to")!),
      );
    }
    if (resource === "categories" && url.searchParams.get("type"))
      items = items.filter((r) => r.type === url.searchParams.get("type"));
    return json(paginate(items, url));
  });
  return { data, collections, writes };
}
