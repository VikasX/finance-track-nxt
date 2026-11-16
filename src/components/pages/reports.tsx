/*
 * src/components/pages/reports.tsx
 * Loads summary/monthly/category reports and matching transactions for a chosen date range. Charts/exports derive from these results; current asset snapshots are not historical valuations.
 * "use client" marks the browser-interactive entry point: hooks/events or browser APIs
 * need JavaScript after hydration. Next may still prerender its initial HTML on the server.
 * Beginner syntax: @/ means src/ (tsconfig paths); import type is compile-time only.
 */
"use client";
// Use the shared settings-aware amount formatter so saved number formatting applies consistently to this screen.
import { useAmount } from "../use-amount";

// Import React hooks for local state/lifecycle/subscriptions and React types where needed. Hooks run at the component top level; type-only names disappear from the browser JavaScript.
import { useState } from "react";
// Import generated response types from openapi.json. These describe API field shapes to TypeScript; they do not fetch data or validate server JSON at runtime.
import type {
  CategoryReportRead,
  DashboardRead,
  MonthlyReportRead,
  SummaryRead,
  TransactionRead,
} from "@/types/api";
// Reuse URL, HTTP, or error helpers instead of duplicating fetch/parsing rules in this file. Browser /api paths are forwarded by the Next proxy.
import { apiPath } from "@/lib/api-client";
// Reuse the shared read cache/write flow. useApi supplies reactive request state; successful mutate calls invalidate cached data so subscribed screens refresh.
import { useApi } from "@/lib/api-cache";
// Reuse decimal/date adapters. Money remains a string at the API boundary; exact totals and display/chart conversion have separate responsibilities.
import { decimal, percent, total } from "@/lib/api-format";
// Reuse formatting, local calculator, or download helpers. These utilities do not perform backend writes.
import { dateLabel, downloadCSV } from "@/lib/finance";
// Reuse document export helpers that turn current API-derived rows into local downloads.
import { downloadExcel, downloadPDF, downloadReportPack } from "@/lib/export";
// Use the common loading/error/retry wrapper, keeping request failure visibly different from an empty successful response.
import { ApiBoundary } from "../ui/api-boundary";
// Import the shared styled UI pieces rather than repeating button/card/dialog/form markup. Their props let this screen supply content and event callbacks.
import {
  Button,
  Card,
  EmptyState,
  Metric,
  Modal,
  PageHeading,
  Tabs,
} from "../ui/primitives";
// Use shared chart components/palette. This caller prepares the data; the chart only renders it.
import { AllocationChart, CHART_COLORS, FinancialChart } from "../charts";
// Render the Reports screen. Read API data first, derive display rows, then return JSX; props/state determine which controls and dialogs are visible.
export function Reports() {
  // Get the shared currency formatter; its settings read is deduplicated by the API cache.
  const amount = useAmount();
  // Keep the readable period label separate from dateFrom/dateTo, which are the actual
  // API filter values. Selecting a preset updates all three through preset().
  const [range, setRange] = useState("YTD (Jan - Oct 2024)");
  // React state stores the inclusive report start date. The setter (second array value) schedules a rerender when a control/event changes it; ordinary local variables would reset on each render.
  const [dateFrom, setDateFrom] = useState("2024-01-01");
  // React state stores the inclusive report end date. The setter (second array value) schedules a rerender when a control/event changes it; ordinary local variables would reset on each render.
  const [dateTo, setDateTo] = useState("2024-10-31");
  // React state stores which prior-period comparison is displayed. The setter (second array value) schedules a rerender when a control/event changes it; ordinary local variables would reset on each render.
  const [comparison, setComparison] = useState("vs Prev Period");
  // React state stores the chosen category filter or editable category record, depending on this screen. The setter (second array value) schedules a rerender when a control/event changes it; ordinary local variables would reset on each render.
  const [category, setCategory] = useState("");
  // React state stores which downloadable report is being previewed. The setter (second array value) schedules a rerender when a control/event changes it; ordinary local variables would reset on each render.
  const [preview, setPreview] = useState<string>();
  const dates = { date_from: dateFrom, date_to: dateTo };
  // Only request report data when both dates exist and are in chronological order. ISO date strings sort correctly in this YYYY-MM-DD format.
  const valid = dateFrom !== "" && dateTo !== "" && dateFrom <= dateTo;
  // Subscribe summary to this API key. The type inside <...> describes the returned data; loading/error/retry travel with it. A changed URL selects a new cached request, and null skips the read.
  const summary = useApi<SummaryRead>(
    valid ? apiPath("/api/reports/summary", dates) : null,
  );
  // Subscribe monthly to this API key. The type inside <...> describes the returned data; loading/error/retry travel with it. A changed URL selects a new cached request, and null skips the read.
  const monthly = useApi<MonthlyReportRead>(
    valid ? apiPath("/api/reports/monthly", dates) : null,
  );
  // Subscribe categories to this API key. The type inside <...> describes the returned data; loading/error/retry travel with it. A changed URL selects a new cached request, and null skips the read.
  const categories = useApi<CategoryReportRead>(
    valid ? apiPath("/api/reports/categories", dates) : null,
  );
  // Subscribe transactions to this API key. The type inside <...> describes the returned data; loading/error/retry travel with it. A changed URL selects a new cached request, and null skips the read.
  const transactions = useApi<TransactionRead[]>(
    valid ? `all:${apiPath("/api/transactions", dates)}` : null,
  );
  // Subscribe previousYear to this API key. The type inside <...> describes the returned data; loading/error/retry travel with it. A changed URL selects a new cached request, and null skips the read.
  const previousYear = useApi<SummaryRead>(
    comparison === "vs Last Year" && valid
      ? apiPath("/api/reports/summary", {
          date_from: `${Number(dateFrom.slice(0, 4)) - 1}${dateFrom.slice(4)}`,
          date_to: `${Number(dateTo.slice(0, 4)) - 1}${dateTo.slice(4)}`,
        })
      : null,
  );
  // Subscribe assetSnapshot to this API key. The type inside <...> describes the returned data; loading/error/retry travel with it. A changed URL selects a new cached request, and null skips the read.
  const assetSnapshot = useApi<DashboardRead>(
    valid
      ? apiPath("/api/dashboard", {
          month: `${dateTo.slice(0, 7)}-01`,
          as_of: dateTo,
        })
      : null,
  );
  // Prepare a current-assets-minus-loans export from the dashboard snapshot; these rows do not reconstruct historical net worth.
  const netWorthRows: (string | number)[][] = assetSnapshot.data
    ? [
        ["Metric", "Current Snapshot INR"],
        ["Investments", assetSnapshot.data.investments.current_value],
        [
          "Fixed Deposits (Estimated)",
          assetSnapshot.data.investments.fixed_deposit_estimated_value,
        ],
        [
          "PPF Reported Balance",
          assetSnapshot.data.investments.ppf_reported_balance,
        ],
        ["Total Assets", assetSnapshot.data.investments.total_asset_value],
        ["Outstanding Loans", assetSnapshot.data.outstanding_loans],
        [
          "Net Assets",
          total([
            assetSnapshot.data.investments.total_asset_value,
            `-${assetSnapshot.data.outstanding_loans}`,
          ]),
        ],
      ]
    : [];
  const s = summary.data;
  // Derive expenses by retaining only rows that match the conditions below. filter creates a new array and leaves the original API records unchanged.
  const expenses = (categories.data?.categories ?? []).filter(
    (r) => r.transaction_type === "expense",
  );
  // Derive pie by retaining only rows that match the conditions below. filter creates a new array and leaves the original API records unchanged.
  const pie = expenses.filter((r) => !category || r.category_name === category);
  // Prepare expenseTotal by transforming each source item. map returns a new array; the response records remain available in their original shape.
  const expenseTotal = total(pie.map((r) => r.amount));
  // Prepare chart by transforming each source item. map returns a new array; the response records remain available in their original shape.
  const chart = (monthly.data?.months ?? []).map((r) => ({
    name: dateLabel(r.month, { month: "short" }),
    income: decimal(r.income),
    expense: decimal(r.expenses),
  }));
  // Prepare txRows by transforming each source item. map returns a new array; the response records remain available in their original shape.
  const txRows = (transactions.data ?? []).map((t) => [
    t.transaction_date,
    t.description,
    t.transaction_type,
    t.payment_method ?? "",
    t.amount,
  ]);
  const statementRows: (string | number)[][] = s
    ? [
        ["Metric", "Value"],
        ["Income", s.totals.income],
        ["Expenses", s.totals.expenses],
        ["Investment Outflow", s.totals.investment_outflow],
        ["Loan Payments", s.totals.loan_payments],
        ["Net Cash Flow", s.totals.net_cash_flow],
        ["Savings Rate", s.totals.savings_rate_percent ?? "Unavailable"],
      ]
    : [];
  const exportRows: (string | number)[][] = [
    ["Date", "Description", "Type", "Payment Channel", "Amount INR"],
    ...txRows,
  ];
  const delta =
    comparison === "vs Prev Period"
      ? s?.expense_change_percent
      : previousYear.data && s && decimal(previousYear.data.totals.expenses) > 0
        ? String(
            (decimal(s.totals.expenses) /
              decimal(previousYear.data.totals.expenses) -
              1) *
              100,
          )
        : null;
  const heatMonth = dateTo.slice(0, 7);
  // Build heatCount from calendar values. JavaScript numeric months are zero-based, so check the adjacent +1/-1 conversions when following the date flow.
  const heatCount = new Date(
    Number(heatMonth.slice(0, 4)),
    Number(heatMonth.slice(5)),
    0,
  ).getDate();
  // Build daily spending cells from real transactions in the final selected month. Missing/invalid end-of-month slots do not represent spending.
  const heat = Array.from({ length: Math.ceil(heatCount / 7) }, (_, week) =>
    Array.from({ length: 7 }, (_, day) => {
      const index = week * 7 + day + 1;
      const date = `${heatMonth}-${String(index).padStart(2, "0")}`;
      return {
        date,
        valid: index <= heatCount,
        value: decimal(
          total(
            (transactions.data ?? [])
              .filter(
                (t) =>
                  t.transaction_type === "expense" &&
                  t.transaction_date === date &&
                  (!category ||
                    categories.data?.categories.find(
                      (c) => c.category_name === category,
                    )?.category_id === t.category_id),
              )
              .map((t) => t.amount),
          ),
        ),
      };
    }),
  );
  // Prepare heatMax by transforming each source item. map returns a new array; the response records remain available in their original shape.
  const heatMax = Math.max(1, ...heat.flat().map((p) => p.value));
  // Translate a human-readable report period into explicit inclusive ISO date filters. Updating those values changes the query keys and triggers the corresponding report reads.
  function preset(value: string) {
    setRange(value);
    if (value === "October 2024") {
      setDateFrom("2024-10-01");
      setDateTo("2024-10-31");
    } else if (value === "Q3 2024 (Jul - Sep)") {
      setDateFrom("2024-07-01");
      setDateTo("2024-09-30");
    } else if (value === "Last 6 Months") {
      setDateFrom("2024-05-01");
      setDateTo("2024-10-31");
    } else if (value === "Full FY 2023–24") {
      setDateFrom("2023-04-01");
      setDateTo("2024-03-31");
    } else {
      setDateFrom("2024-01-01");
      setDateTo("2024-10-31");
    }
  }
  return (
    <div className="page-stack">
      {/* Page title and primary actions share the same layout classes; callbacks below change state or start an operation when clicked. */}
      <PageHeading
        title="Reports & Analytics"
        eyebrow="Intelligence Center"
        badge="API Connected"
        description="Cash flow summaries, category distributions, spending heatmaps, and financial statements."
        actions={
          <>
            <select
              aria-label="Report date range"
              className="filter-select"
              value={range}
              onChange={(e) => preset(e.target.value)}
            >
              {/* Turn matching items into JSX with map. Each repeated element needs a stable key so React preserves the right row/control when data changes. */}
              {[
                "YTD (Jan - Oct 2024)",
                "October 2024",
                "Q3 2024 (Jul - Sep)",
                "Last 6 Months",
                "Full FY 2023–24",
                "Custom",
              ].map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
            <Button
              icon="download"
              disabled={!s}
              onClick={
                // Build a local download from the currently available API-derived rows. This exports a snapshot; it does not create or update financial records.
                () =>
                  downloadPDF(
                    "fintrack-report.pdf",
                    `Financial Report ${dateFrom} to ${dateTo}`,
                    statementRows,
                  )

              }
            >
              Export PDF
            </Button>
            <Button
              icon="download"
              disabled={!transactions.data}
              onClick={
                // Build a local download from the currently available API-derived rows. This exports a snapshot; it does not create or update financial records.
                () => downloadCSV("fintrack-report.csv", exportRows)
              }
            >
              Export CSV
            </Button>
          </>
        }
      />
      <Card className="!p-4">
        <div className="filters">
          <label className="field">
            From
            <input
              aria-label="Report start date"
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setRange("Custom");
                setDateFrom(e.target.value);
              }}
            />
          </label>
          <label className="field">
            To
            <input
              aria-label="Report end date"
              type="date"
              value={dateTo}
              onChange={(e) => {
                setRange("Custom");
                setDateTo(e.target.value);
              }}
            />
          </label>
          <label className="text-xs muted">
            Chart category
            <select
              aria-label="Report category"
              className="filter-select"
              value={category}
              onChange={
                // Filter the category pie and daily heatmap locally. Summary cards keep
                // the full selected date range because this choice does not change their API URL.
                (e) => setCategory(e.target.value)
              }
            >
              <option value="">All Expense Categories</option>
              {/* Turn matching items into JSX with map. Each repeated element needs a stable key so React preserves the right row/control when data changes. */}
              {expenses.map((r) => (
                <option key={r.category_id ?? "none"} value={r.category_name}>
                  {r.category_name}
                </option>
              ))}
            </select>
          </label>
          <div className="ml-auto">
            <Tabs
              value={comparison}
              onChange={setComparison}
              items={["vs Prev Period", "vs Last Year"]}
            />
          </div>
        </div>
        <p className="muted text-[10px] mt-3">
          Date filters apply to all report totals. The category selection
          filters the pie chart and heatmap; the API reports do not provide
          account-level filtering.
        </p>
      </Card>
      {/* Turn matching items into JSX with map. Each repeated element needs a stable key so React preserves the right row/control when data changes. */}
      {!valid ? (
        <p role="alert" className="api-error">
          Choose valid dates with the start before the end.
        </p>
      ) : (
        <>
          {/* Request state belongs here: show initial loading or an error with Retry before treating the following content as successful data. */}
          <ApiBoundary query={summary}>
            {/* Conditional JSX: render the following block only when the left-hand condition is truthy; otherwise React leaves it out. */}
            {s && (
              <>
                <div className="metric-grid">
                  <Metric
                    label="Savings Rate"
                    value={percent(s.totals.savings_rate_percent)}
                    icon="savings"
                    detail="Income less operating expenses"
                  />
                  <Metric
                    label="Operating Spend"
                    value={amount(s.totals.expenses)}
                    icon="receipt_long"
                    detail={
                      delta == null
                        ? "No comparison baseline available"
                        : `${percent(delta)} change ${comparison.toLowerCase()}`
                    }
                  />
                  <Metric
                    label="Top Outflow Category"
                    value={
                      <span className="text-sm !font-sans tracking-normal">
                        {expenses
                          .slice()
                          .sort(
                            (a, b) => decimal(b.amount) - decimal(a.amount),
                          )[0]?.category_name ?? "No expense activity"}
                      </span>
                    }
                    icon="restaurant"
                    detail="From category report"
                  />
                  <Metric
                    label="Net Cash Flow"
                    value={amount(s.totals.net_cash_flow)}
                    icon="account_balance_wallet"
                    detail={`${s.totals.transaction_count} recorded transactions`}
                  />
                </div>
                <div className="info-strip">{s.accounting_basis}</div>
              </>
            )}
          </ApiBoundary>
          {/* Conditional JSX: render the following block only when the left-hand condition is truthy; otherwise React leaves it out. */}
          {comparison === "vs Last Year" && (
            <ApiBoundary query={previousYear}>
              <p className="muted text-xs">
                Prior-year operating expenses:{" "}
                {amount(previousYear.data?.totals.expenses)}
              </p>
            </ApiBoundary>
          )}
          <div className="grid-main">
            {/* Cash Inflow vs Outflow section: the shared Card supplies the existing surface/spacing, while this screen supplies its contents. */}
            <Card
              title="Cash Inflow vs Outflow"
              subtitle={`${dateFrom} – ${dateTo} · Operating expenses and income`}
            >
              {/* Request state belongs here: show initial loading or an error with Retry before treating the following content as successful data. */}
              <ApiBoundary query={monthly}>
                {/* Render numeric points derived from the API. Formatting and chart conversion affect presentation; the original decimal-string response stays unchanged. */}
                <FinancialChart data={chart} height={310} showSurplus />
              </ApiBoundary>
            </Card>
            {/* Category Outflow section: the shared Card supplies the existing surface/spacing, while this screen supplies its contents. */}
            <Card
              title="Category Outflow"
              subtitle="Operating expense categories only"
            >
              {/* Request state belongs here: show initial loading or an error with Retry before treating the following content as successful data. */}
              <ApiBoundary query={categories}>
                {/* Turn matching items into JSX with map. Each repeated element needs a stable key so React preserves the right row/control when data changes. */}
                {pie.length ? (
                  <>
                    {/* Render numeric points derived from the API. Formatting and chart conversion affect presentation; the original decimal-string response stays unchanged. */}
                    <AllocationChart
                      data={pie.map((r) => ({
                        name: r.category_name,
                        value: decimal(r.amount),
                      }))}
                      center={amount(expenseTotal)}
                      caption="Total Expenses"
                      height={235}
                    />
                    {/* Turn matching items into JSX with map. Each repeated element needs a stable key so React preserves the right row/control when data changes. */}
                    {pie.map((r, i) => (
                      <div className="legend-row" key={r.category_id ?? "none"}>
                        <span
                          className="legend-dot"
                          style={{
                            background: CHART_COLORS[i % CHART_COLORS.length],
                          }}
                        />
                        <span>{r.category_name}</span>
                        <strong>
                          {amount(r.amount)}{" "}
                          <span className="muted">
                            {percent(r.share_of_type_percent)}
                          </span>
                        </strong>
                      </div>
                    ))}
                  </>
                ) : (
                  <EmptyState text="No expenses in this period." />
                )}
              </ApiBoundary>
            </Card>
          </div>
          {/* Spending Velocity Heatmap section: the shared Card supplies the existing surface/spacing, while this screen supplies its contents. */}
          <Card
            title="Spending Velocity Heatmap"
            subtitle={`Daily expense distribution in ${heatMonth}`}
          >
            {/* Request state belongs here: show initial loading or an error with Retry before treating the following content as successful data. */}
            <ApiBoundary query={transactions}>
              <div className="heatmap-scroll">
                <div className="heatmap">
                  <span>Week Cycle</span>
                  {Array.from({ length: 7 }, (_, i) => (
                    <span key={i} className="text-center muted">
                      Day {i + 1}
                    </span>
                  ))}
                  {/* Turn matching items into JSX with map. Each repeated element needs a stable key so React preserves the right row/control when data changes. */}
                  {heat.map((week, i) => (
                    <div className="contents" key={i}>
                      <strong>Week {i + 1}</strong>
                      {/* Turn matching items into JSX with map. Each repeated element needs a stable key so React preserves the right row/control when data changes. */}
                      {week.map((p) => (
                        <div
                          key={p.date}
                          className="heatmap-cell"
                          title={p.date}
                          style={{
                            background: `rgba(124,58,237,${0.045 + (p.value / heatMax) * 0.9})`,
                            color:
                              p.value / heatMax > 0.5
                                ? "white"
                                : "var(--accent)",
                          }}
                        >
                          {/* Choose one of two UI branches with condition ? trueBranch : falseBranch. This keeps selected/empty/alternate states in the same layout position. */}
                          {p.valid ? amount(p.value) : "—"}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </ApiBoundary>
          </Card>
          {/* AI Financial Insights & Anomalies section: the shared Card supplies the existing surface/spacing, while this screen supplies its contents. */}
          <Card title="AI Financial Insights & Anomalies">
            <EmptyState text="AI insights, spending anomalies, and tax projections are not exposed by the current API." />
          </Card>
          {/* Downloadable Fiscal Statements section: the shared Card supplies the existing surface/spacing, while this screen supplies its contents. */}
          <Card
            title="Downloadable Fiscal Statements"
            subtitle="Generated from the API’s reported records and totals"
          >
            {/* Choose one of two UI branches with condition ? trueBranch : falseBranch. This keeps selected/empty/alternate states in the same layout position. */}
            {assetSnapshot.error ? (
              <ApiBoundary query={assetSnapshot}>{null}</ApiBoundary>
            ) : null}
            <div className="insights-grid">
              {/* Turn matching items into JSX with map. Each repeated element needs a stable key so React preserves the right row/control when data changes. */}
              {[
                {
                  title: "Monthly Ledger Statement",
                  format: "PDF",
                  action: "Get PDF",
                },
                {
                  title: "Financial Records Pack",
                  format: "ZIP (PDF + CSV)",
                  action: "Download Pack",
                },
                {
                  title: "Current Net Worth Snapshot",
                  format: "Excel",
                  action: "Download XLS",
                },
              ].map((item) => (
                <div className="statement-card" key={item.title}>
                  <h3>{item.title}</h3>
                  <p className="muted text-xs mt-3 flex-1">
                    {/* Choose one of two UI branches with condition ? trueBranch : falseBranch. This keeps selected/empty/alternate states in the same layout position. */}
                    {item.title === "Current Net Worth Snapshot"
                      ? "Current reported assets and liabilities, not a historical valuation at the selected date."
                      : "Recorded cash flow and transaction summary for your selected period."}
                  </p>
                  <div className="text-[10px] muted my-4">
                    {item.format} · Personal statement
                  </div>
                  <div className="flex gap-2">
                    <Button
                      disabled={
                        !s || (item.format === "Excel" && !assetSnapshot.data)
                      }
                      className="flex-1"
                      onClick={
                        // Open/close a preview of API-derived export rows. Previewing is separate from downloading and does not save financial records.
                        () => setPreview(item.title)
                      }
                    >
                      Preview
                    </Button>
                    <Button
                      variant="primary"
                      disabled={
                        !s ||
                        !transactions.data ||
                        (item.format === "Excel" && !assetSnapshot.data)
                      }
                      onClick={
                        // Build a local download from the currently available API-derived rows. This exports a snapshot; it does not create or update financial records.
                        () =>
                          item.format === "PDF"
                            ? downloadPDF(
                                "fintrack-ledger.pdf",
                                item.title,
                                exportRows,
                              )
                            : item.format === "Excel"
                              ? downloadExcel(
                                  "fintrack-summary.xml",
                                  netWorthRows,
                                )
                              : downloadReportPack(statementRows)

                      }
                    >
                      {item.action}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
      {/* The parent owns open/close state; Modal handles the native dialog and scroll cleanup. Content is only mounted while open. */}
      <Modal
        open={Boolean(preview)}
        title={preview ?? "Statement Preview"}
        wide
        onClose={
          // Open/close a preview of API-derived export rows. Previewing is separate from downloading and does not save financial records.
          () => setPreview(undefined)
        }
      >
        <div className="table-scroll">
          <table>
            <tbody>
              {/* Turn matching items into JSX with map. Each repeated element needs a stable key so React preserves the right row/control when data changes. */}
              {(preview === "Monthly Ledger Statement"
                ? exportRows
                : preview === "Current Net Worth Snapshot"
                  ? netWorthRows
                  : statementRows
              ).map((r, i) => (
                <tr key={i}>
                  {/* Turn matching items into JSX with map. Each repeated element needs a stable key so React preserves the right row/control when data changes. */}
                  {r.map((cell, j) => (
                    <td key={j}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>
    </div>
  );
}
