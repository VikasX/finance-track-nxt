"use client";
import { useAmount } from "../use-amount";

import { useState } from "react";
import type {
  CategoryReportRead,
  DashboardRead,
  MonthlyReportRead,
  SummaryRead,
  TransactionRead,
} from "@/types/api";
import { apiPath } from "@/lib/api-client";
import { useApi } from "@/lib/api-cache";
import { decimal, percent, total } from "@/lib/api-format";
import { dateLabel, downloadCSV } from "@/lib/finance";
import { downloadExcel, downloadPDF, downloadReportPack } from "@/lib/export";
import { ApiBoundary } from "../ui/api-boundary";
import {
  Button,
  Card,
  EmptyState,
  Metric,
  Modal,
  PageHeading,
  Tabs,
} from "../ui/primitives";
import { AllocationChart, CHART_COLORS, FinancialChart } from "../charts";
export function Reports() {
  const amount = useAmount();
  const [range, setRange] = useState("YTD (Jan - Oct 2024)");
  const [dateFrom, setDateFrom] = useState("2024-01-01");
  const [dateTo, setDateTo] = useState("2024-10-31");
  const [comparison, setComparison] = useState("vs Prev Period");
  const [category, setCategory] = useState("");
  const [preview, setPreview] = useState<string>();
  const dates = { date_from: dateFrom, date_to: dateTo };
  const valid = dateFrom !== "" && dateTo !== "" && dateFrom <= dateTo;
  const summary = useApi<SummaryRead>(
    valid ? apiPath("/api/reports/summary", dates) : null,
  );
  const monthly = useApi<MonthlyReportRead>(
    valid ? apiPath("/api/reports/monthly", dates) : null,
  );
  const categories = useApi<CategoryReportRead>(
    valid ? apiPath("/api/reports/categories", dates) : null,
  );
  const transactions = useApi<TransactionRead[]>(
    valid ? `all:${apiPath("/api/transactions", dates)}` : null,
  );
  const previousYear = useApi<SummaryRead>(
    comparison === "vs Last Year" && valid
      ? apiPath("/api/reports/summary", {
          date_from: `${Number(dateFrom.slice(0, 4)) - 1}${dateFrom.slice(4)}`,
          date_to: `${Number(dateTo.slice(0, 4)) - 1}${dateTo.slice(4)}`,
        })
      : null,
  );
  const assetSnapshot = useApi<DashboardRead>(
    valid
      ? apiPath("/api/dashboard", {
          month: `${dateTo.slice(0, 7)}-01`,
          as_of: dateTo,
        })
      : null,
  );
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
  const expenses = (categories.data?.categories ?? []).filter(
    (r) => r.transaction_type === "expense",
  );
  const pie = expenses.filter((r) => !category || r.category_name === category);
  const expenseTotal = total(pie.map((r) => r.amount));
  const chart = (monthly.data?.months ?? []).map((r) => ({
    name: dateLabel(r.month, { month: "short" }),
    income: decimal(r.income),
    expense: decimal(r.expenses),
  }));
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
  const heatCount = new Date(
    Number(heatMonth.slice(0, 4)),
    Number(heatMonth.slice(5)),
    0,
  ).getDate();
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
  const heatMax = Math.max(1, ...heat.flat().map((p) => p.value));
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
              onClick={() =>
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
              onClick={() => downloadCSV("fintrack-report.csv", exportRows)}
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
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">All Expense Categories</option>
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
      {!valid ? (
        <p role="alert" className="api-error">
          Choose valid dates with the start before the end.
        </p>
      ) : (
        <>
          <ApiBoundary query={summary}>
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
          {comparison === "vs Last Year" && (
            <ApiBoundary query={previousYear}>
              <p className="muted text-xs">
                Prior-year operating expenses:{" "}
                {amount(previousYear.data?.totals.expenses)}
              </p>
            </ApiBoundary>
          )}
          <div className="grid-main">
            <Card
              title="Cash Inflow vs Outflow"
              subtitle={`${dateFrom} – ${dateTo} · Operating expenses and income`}
            >
              <ApiBoundary query={monthly}>
                <FinancialChart data={chart} height={310} showSurplus />
              </ApiBoundary>
            </Card>
            <Card
              title="Category Outflow"
              subtitle="Operating expense categories only"
            >
              <ApiBoundary query={categories}>
                {pie.length ? (
                  <>
                    <AllocationChart
                      data={pie.map((r) => ({
                        name: r.category_name,
                        value: decimal(r.amount),
                      }))}
                      center={amount(expenseTotal)}
                      caption="Total Expenses"
                      height={235}
                    />
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
          <Card
            title="Spending Velocity Heatmap"
            subtitle={`Daily expense distribution in ${heatMonth}`}
          >
            <ApiBoundary query={transactions}>
              <div className="heatmap-scroll">
                <div className="heatmap">
                  <span>Week Cycle</span>
                  {Array.from({ length: 7 }, (_, i) => (
                    <span key={i} className="text-center muted">
                      Day {i + 1}
                    </span>
                  ))}
                  {heat.map((week, i) => (
                    <div className="contents" key={i}>
                      <strong>Week {i + 1}</strong>
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
                          {p.valid ? amount(p.value) : "—"}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </ApiBoundary>
          </Card>
          <Card title="AI Financial Insights & Anomalies">
            <EmptyState text="AI insights, spending anomalies, and tax projections are not exposed by the current API." />
          </Card>
          <Card
            title="Downloadable Fiscal Statements"
            subtitle="Generated from the API’s reported records and totals"
          >
            {assetSnapshot.error ? (
              <ApiBoundary query={assetSnapshot}>{null}</ApiBoundary>
            ) : null}
            <div className="insights-grid">
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
                      onClick={() => setPreview(item.title)}
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
                      onClick={() =>
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
      <Modal
        open={Boolean(preview)}
        title={preview ?? "Statement Preview"}
        wide
        onClose={() => setPreview(undefined)}
      >
        <div className="table-scroll">
          <table>
            <tbody>
              {(preview === "Monthly Ledger Statement"
                ? exportRows
                : preview === "Current Net Worth Snapshot"
                  ? netWorthRows
                  : statementRows
              ).map((r, i) => (
                <tr key={i}>
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
