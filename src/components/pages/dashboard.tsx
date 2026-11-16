/*
 * src/components/pages/dashboard.tsx
 * Combines /api/dashboard cards, budgets, recent entries, and obligations with /api/reports/monthly chart data. The shared month comes from FinanceProvider; backend balance means net cash flow, not a bank balance.
 * "use client" marks the browser-interactive entry point: hooks/events or browser APIs
 * need JavaScript after hydration. Next may still prerender its initial HTML on the server.
 * Beginner syntax: @/ means src/ (tsconfig paths); import type is compile-time only.
 */
"use client";
// Use the shared settings-aware amount formatter so saved number formatting applies consistently to this screen.
import { useAmount } from "../use-amount";

// Use Next Link for in-app navigation so moving between routes can reuse the app shell instead of doing a full document reload.
import Link from "next/link";
// Import React hooks for local state/lifecycle/subscriptions and React types where needed. Hooks run at the component top level; type-only names disappear from the browser JavaScript.
import { useState } from "react";
// Import generated response types from openapi.json. These describe API field shapes to TypeScript; they do not fetch data or validate server JSON at runtime.
import type {
  CategoryRead,
  DashboardRead,
  MonthlyReportRead,
} from "@/types/api";
// Reuse the shared read cache/write flow. useApi supplies reactive request state; successful mutate calls invalidate cached data so subscribed screens refresh.
import { useApi } from "@/lib/api-cache";
// Reuse URL, HTTP, or error helpers instead of duplicating fetch/parsing rules in this file. Browser /api paths are forwarded by the Next proxy.
import { apiPath } from "@/lib/api-client";
// Reuse decimal/date adapters. Money remains a string at the API boundary; exact totals and display/chart conversion have separate responsibilities.
import { decimal, monthRange, percent } from "@/lib/api-format";
// Reuse formatting, local calculator, or download helpers. These utilities do not perform backend writes.
import { dateLabel, downloadCSV } from "@/lib/finance";
// Read shared UI context for the selected month, global transaction dialog, or toast messages. Financial records still come from API hooks.
import { useFinance } from "../finance-provider";
// Use the common loading/error/retry wrapper, keeping request failure visibly different from an empty successful response.
import { ApiBoundary } from "../ui/api-boundary";
// Import the shared styled UI pieces rather than repeating button/card/dialog/form markup. Their props let this screen supply content and event callbacks.
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Metric,
  PageHeading,
  Progress,
  Tabs,
} from "../ui/primitives";
// Use shared chart components/palette. This caller prepares the data; the chart only renders it.
import { AllocationChart, CHART_COLORS, FinancialChart } from "../charts";
// Reuse ledger column rendering and edit/delete actions; this caller supplies the records, categories, and any server pagination.
import { TransactionTable } from "../transaction-table";
// Render the Dashboard screen. Read API data first, derive display rows, then return JSX; props/state determine which controls and dialogs are visible.
export function Dashboard() {
  // Get the shared currency formatter; its settings read is deduplicated by the API cache.
  const amount = useAmount();
  // Destructure shared UI values and setters from FinanceProvider. Object braces select named properties; they do not create independent copies of the underlying state.
  const { month, setTransactionOpen } = useFinance();
  // React state stores the selected chart grouping (monthly/quarterly/yearly). The setter (second array value) schedules a rerender when a control/event changes it; ordinary local variables would reset on each render.
  const [period, setPeriod] = useState("Monthly");
  // React state stores the chosen category filter or editable category record, depending on this screen. The setter (second array value) schedules a rerender when a control/event changes it; ordinary local variables would reset on each render.
  const [category, setCategory] = useState("");
  // React state stores whether the dashboard summary strip is still visible. The setter (second array value) schedules a rerender when a control/event changes it; ordinary local variables would reset on each render.
  const [advisory, setAdvisory] = useState(true);
  // Split the shared YYYY-MM string into numeric year/month values. JavaScript Date uses zero-based months, so the following constructor determines whether this means this month or next month.
  const [y, m] = month.split("-").map(Number);
  // Build asOf from calendar values. JavaScript numeric months are zero-based, so check the adjacent +1/-1 conversions when following the date flow.
  const asOf = new Date(y, m, 1);
  // Send an explicit ISO snapshot date. The dashboard uses it for scheduled obligations/valuation context rather than guessing the current date.
  const as_of = `${asOf.getFullYear()}-${String(asOf.getMonth() + 1).padStart(2, "0")}-01`;
  // Subscribe dashboard to this API key. The type inside <...> describes the returned data; loading/error/retry travel with it. A changed URL selects a new cached request, and null skips the read.
  const dashboard = useApi<DashboardRead>(
    apiPath("/api/dashboard", { month: `${month}-01`, as_of }),
  );
  // Subscribe categories to this API key. The type inside <...> describes the returned data; loading/error/retry travel with it. A changed URL selects a new cached request, and null skips the read.
  const categories = useApi<CategoryRead[]>("all:/api/categories");
  // Subscribe monthly to this API key. The type inside <...> describes the returned data; loading/error/retry travel with it. A changed URL selects a new cached request, and null skips the read.
  const monthly = useApi<MonthlyReportRead>(
    apiPath("/api/reports/monthly", {
      date_from: `${y}-01-01`,
      date_to: monthRange(month).date_to,
    }),
  );
  // Short local alias for dashboard.data; it may be undefined during loading/failure. The JSX below checks d before reading nested fields.
  const d = dashboard.data;
  // Join numeric budget category IDs with loaded category names. Optional chaining tolerates categories still loading and keeps an ID fallback visible.
  const catName = (id: number) =>
    categories.data?.find((c) => c.id === id)?.name ?? `Category ${id}`;
  // Prepare monthlyPoints by transforming each source item. map returns a new array; the response records remain available in their original shape.
  const monthlyPoints = (monthly.data?.months ?? []).map((p) => ({
    name: dateLabel(p.month, { month: "short" }),
    income: decimal(p.income),
    expense: decimal(p.expenses),
  }));
  // Choose derived grouping from the selected tab: monthly points, three-month sums, or one year total. No additional API write occurs when switching chart tabs.
  const chart =
    period === "Monthly"
      ? monthlyPoints
      : period === "Quarterly"
        ? Array.from(
            { length: Math.ceil(monthlyPoints.length / 3) },
            (_, i) => ({
              name: `Q${i + 1}`,
              income: monthlyPoints
                .slice(i * 3, i * 3 + 3)
                .reduce((n, p) => n + p.income, 0),
              expense: monthlyPoints
                .slice(i * 3, i * 3 + 3)
                .reduce((n, p) => n + p.expense, 0),
            }),
          )
        : [
            {
              name: String(y),
              income: monthlyPoints.reduce((n, p) => n + p.income, 0),
              expense: monthlyPoints.reduce((n, p) => n + p.expense, 0),
            },
          ];
  // Build donut slices from dashboard investment/FD/PPF response fields. These are current asset snapshots, not ledger cash balance or an invented history.
  const allocation = d
    ? [
        {
          name: "Stocks & Mutual Funds",
          value: decimal(d.investments.current_value),
        },
        {
          name: "Fixed Deposits (Estimated)",
          value: decimal(d.investments.fixed_deposit_estimated_value),
        },
        {
          name: "PPF Reported Balance",
          value: decimal(d.investments.ppf_reported_balance),
        },
      ]
    : [];
  return (
    <div className="page-stack">
      {/* Page title and primary actions share the same layout classes; callbacks below change state or start an operation when clicked. */}
      <PageHeading
        title="Financial Overview"
        description="Your financial telemetry, performance analytics, and upcoming liquidity schedule."
        actions={
          <>
            <Badge tone="gray">{d?.currency ?? "INR"}</Badge>
            <Button
              disabled={!d}
              icon="file_download"
              onClick={
                // Build a local download from the currently available API-derived rows. This exports a snapshot; it does not create or update financial records.
                () => {
                  if (d)
                    downloadCSV("fintrack-overview.csv", [
                      ["Metric", "Value"],
                      ["Income", d.income],
                      ["Expenses", d.expenses],
                      ["Net Cash Flow", d.balance],
                      ["Portfolio", d.investments.total_asset_value],
                    ]);
                }
              }
            >
              Export
            </Button>
            <Button
              variant="primary"
              icon="add_circle"
              onClick={
                // Toggle the shared transaction dialog through FinanceProvider. The existing form is reused across the header and page action.
                () => setTransactionOpen(true)
              }
            >
              Add Transaction
            </Button>
          </>
        }
      />
      {/* Request state belongs here: show initial loading or an error with Retry before treating the following content as successful data. */}
      <ApiBoundary query={dashboard}>
        {/* Turn matching items into JSX with map. Each repeated element needs a stable key so React preserves the right row/control when data changes. */}
        {d && (
          <>
            <div className="metric-grid">
              <Metric
                label="Net Cash Flow"
                value={amount(d.balance)}
                icon="account_balance"
                detail="Recorded income less cash outflows"
              />
              <Metric
                label="Monthly Inflow"
                value={amount(d.income)}
                icon="south_west"
                detail="Recorded income credits"
              />
              <Metric
                label="Monthly Expenses"
                value={amount(d.expenses)}
                icon="north_east"
                detail="Operating expenses only"
                footer={`${percent(d.cash_flow.savings_rate_percent)} savings rate`}
              />
              <Metric
                label="Total Portfolio"
                value={amount(d.investments.total_asset_value)}
                icon="insights"
                detail={
                  <Badge tone="green">
                    {percent(d.investments.gain_loss_percent)} investment return
                  </Badge>
                }
              />
            </div>
            <div className="info-strip">
              <span>{d.balance_basis}</span>
            </div>
            <div className="grid-main">
              {/* Cash Flow Overview section: the shared Card supplies the existing surface/spacing, while this screen supplies its contents. */}
              <Card
                title="Cash Flow Overview"
                subtitle="Income and operating expenses across the selected year"
                action={
                  <Badge tone="green">
                    {amount(d.cash_flow.net_cash_flow)} Net Cash Flow
                  </Badge>
                }
              >
                <div className="flex justify-end mb-5">
                  <Tabs
                    value={period}
                    onChange={
                      // Choose a local chart grouping; the page derives monthly, quarterly, or yearly points from already-loaded report rows.
                      setPeriod
                    }
                    items={["Monthly", "Quarterly", "Yearly"]}
                  />
                </div>
                {/* Request state belongs here: show initial loading or an error with Retry before treating the following content as successful data. */}
                <ApiBoundary query={monthly}>
                  {/* Render numeric points derived from the API. Formatting and chart conversion affect presentation; the original decimal-string response stays unchanged. */}
                  <FinancialChart data={chart} />
                </ApiBoundary>
                <div className="info-strip mt-5 flex-wrap">
                  <span>
                    Savings Rate:{" "}
                    <strong className="positive">
                      {percent(d.cash_flow.savings_rate_percent)}
                    </strong>
                  </span>
                  <Link
                    href="/income-expenses"
                    className="ml-auto text-violet-700 text-xs font-semibold"
                  >
                    Cashflow Statement →
                  </Link>
                </div>
              </Card>
              {/* Budget Overview section: the shared Card supplies the existing surface/spacing, while this screen supplies its contents. */}
              <Card
                title="Budget Overview"
                subtitle={`${dateLabel(d.month, { month: "long" })} · ${amount(d.budget_usage.spent_amount)} spent`}
              >
                <div className="space-y-5">
                  {/* Turn matching items into JSX with map. Each repeated element needs a stable key so React preserves the right row/control when data changes. */}
                  {d.budget_usage.budgets.length ? (
                    d.budget_usage.budgets.map((b) => (
                      <div key={b.id}>
                        <div className="flex items-center justify-between gap-2 text-xs mb-2">
                          <span>{catName(b.category_id)}</span>
                          <span className="font-mono text-[10px]">
                            {amount(b.spent_amount)} / {amount(b.limit_amount)}
                          </span>
                        </div>
                        <Progress
                          value={decimal(b.usage_percent)}
                          tone={
                            decimal(b.usage_percent) > 90 ? "amber" : "purple"
                          }
                        />
                      </div>
                    ))
                  ) : (
                    <EmptyState text="No budgets for this month." />
                  )}
                </div>
                <div className="split-line" />
                <div className="flex justify-between text-xs">
                  <span className="muted">
                    Total Cap: {amount(d.budget_usage.limit_amount)}
                  </span>
                  <Link
                    href="/budgets"
                    className="text-violet-700 font-semibold"
                  >
                    Manage Budgets
                  </Link>
                </div>
              </Card>
            </div>
            <div className="grid-halves">
              {/* Investment Allocation section: the shared Card supplies the existing surface/spacing, while this screen supplies its contents. */}
              <Card
                title="Investment Allocation"
                subtitle="Current reported asset snapshots"
              >
                {/* Render numeric points derived from the API. Formatting and chart conversion affect presentation; the original decimal-string response stays unchanged. */}
                <AllocationChart
                  data={allocation}
                  center={amount(d.investments.total_asset_value)}
                  caption="Current Value"
                />
                {/* Turn matching items into JSX with map. Each repeated element needs a stable key so React preserves the right row/control when data changes. */}
                {allocation.map((a, i) => (
                  <div className="legend-row" key={a.name}>
                    <i
                      className="legend-dot"
                      style={{ background: CHART_COLORS[i] }}
                    />
                    {a.name}
                    <strong>{amount(a.value)}</strong>
                  </div>
                ))}
                <div className="split-line" />
                <Link
                  href="/stocks-investments"
                  className="text-xs text-violet-700 font-semibold"
                >
                  Manage Investments →
                </Link>
              </Card>
              {/* Upcoming Obligations section: the shared Card supplies the existing surface/spacing, while this screen supplies its contents. */}
              <Card
                title="Upcoming Obligations"
                subtitle={`As of ${dateLabel(d.as_of)} · Scheduled loans, SIPs, maturities and reminders`}
              >
                <div>
                  {/* Turn matching items into JSX with map. Each repeated element needs a stable key so React preserves the right row/control when data changes. */}
                  {d.upcoming_obligations.length ? (
                    d.upcoming_obligations.slice(0, 6).map((e) => (
                      <div
                        className="flex items-center gap-3 border-b border-slate-100 py-4"
                        key={`${e.source}-${e.source_id}`}
                      >
                        <div className="event-date">
                          <small>
                            {dateLabel(e.due_date, { month: "short" })}
                          </small>
                          <strong>{e.due_date.slice(8)}</strong>
                        </div>
                        <div>
                          <strong className="block text-xs">{e.title}</strong>
                          <small className="muted text-[10px]">
                            {e.source.replaceAll("_", " ")}
                            {/* Choose one of two UI branches with condition ? trueBranch : falseBranch. This keeps selected/empty/alternate states in the same layout position. */}
                            {e.overdue ? " · Overdue" : ""}
                          </small>
                        </div>
                        <strong
                          className={`ml-auto font-mono text-xs ${e.direction === "inflow" ? "positive" : ""}`}
                        >
                          {amount(e.amount)}
                        </strong>
                      </div>
                    ))
                  ) : (
                    <EmptyState text="No upcoming obligations." />
                  )}
                </div>
                <Link
                  href="/calendar"
                  className="block text-right mt-5 text-xs text-violet-700 font-semibold"
                >
                  View All Reminders →
                </Link>
              </Card>
            </div>
            {/* Request state belongs here: show initial loading or an error with Retry before treating the following content as successful data. */}
            <ApiBoundary query={categories}>
              {/* Pass rows and display/interaction instructions to the shared table. Stable record IDs identify rows; server pagination must use the backend total, not items.length. */}
              <TransactionTable
                compact
                rows={d.recent_transactions.filter(
                  (t) => !category || String(t.category_id) === category,
                )}
                categories={categories.data}
                toolbar={
                  <>
                    <div>
                      <h2>Recent Transactions</h2>
                      <p className="muted text-xs mt-1">
                        Latest recorded ledger entries
                      </p>
                    </div>
                    <div className="filters">
                      <select
                        aria-label="Recent transaction category"
                        className="filter-select"
                        value={category}
                        onChange={
                          // Update the chosen category. Ledger filters also reset page one via change(); the dashboard filters its already-returned recent rows locally.
                          (e) => setCategory(e.target.value)
                        }
                      >
                        <option value="">All Categories</option>
                        {/* Turn matching items into JSX with map. Each repeated element needs a stable key so React preserves the right row/control when data changes. */}
                        {categories.data?.map((c) => (
                          <option value={c.id} key={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <Link
                        href="/income-expenses"
                        className="text-xs text-violet-700 font-semibold"
                      >
                        View All Transactions →
                      </Link>
                    </div>
                  </>
                }
              />
            </ApiBoundary>
            {/* Conditional JSX: render the following block only when the left-hand condition is truthy; otherwise React leaves it out. */}
            {advisory && (
              <div className="advisory">
                <div>
                  <h3>FinTrack Financial Summary</h3>
                  <p>
                    Recorded savings rate:{" "}
                    {percent(d.cash_flow.savings_rate_percent)}. Review{" "}
                    {amount(d.outstanding_loans)} in outstanding loans and your
                    scheduled commitments before allocating surplus.
                  </p>
                </div>
                <Link
                  href="/stocks-investments"
                  className="button button-primary"
                >
                  Review Allocation
                </Link>
                <button
                  className="icon-button"
                  aria-label="Dismiss advisory"
                  onClick={
                    // Dismiss the dashboard summary strip for this mounted view; it does not delete any financial data.
                    () => setAdvisory(false)
                  }
                >
                  ×
                </button>
              </div>
            )}
          </>
        )}
      </ApiBoundary>
    </div>
  );
}
