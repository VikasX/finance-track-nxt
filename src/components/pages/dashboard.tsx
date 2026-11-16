"use client";
import { useAmount } from "../use-amount";

import Link from "next/link";
import { useState } from "react";
import type {
  CategoryRead,
  DashboardRead,
  MonthlyReportRead,
} from "@/types/api";
import { useApi } from "@/lib/api-cache";
import { apiPath } from "@/lib/api-client";
import { decimal, monthRange, percent } from "@/lib/api-format";
import { dateLabel, downloadCSV } from "@/lib/finance";
import { useFinance } from "../finance-provider";
import { ApiBoundary } from "../ui/api-boundary";
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
import { AllocationChart, CHART_COLORS, FinancialChart } from "../charts";
import { TransactionTable } from "../transaction-table";
export function Dashboard() {
  const amount = useAmount();
  const { month, setTransactionOpen } = useFinance();
  const [period, setPeriod] = useState("Monthly");
  const [category, setCategory] = useState("");
  const [advisory, setAdvisory] = useState(true);
  const [y, m] = month.split("-").map(Number);
  const asOf = new Date(y, m, 1);
  const as_of = `${asOf.getFullYear()}-${String(asOf.getMonth() + 1).padStart(2, "0")}-01`;
  const dashboard = useApi<DashboardRead>(
    apiPath("/api/dashboard", { month: `${month}-01`, as_of }),
  );
  const categories = useApi<CategoryRead[]>("all:/api/categories");
  const monthly = useApi<MonthlyReportRead>(
    apiPath("/api/reports/monthly", {
      date_from: `${y}-01-01`,
      date_to: monthRange(month).date_to,
    }),
  );
  const d = dashboard.data;
  const catName = (id: number) =>
    categories.data?.find((c) => c.id === id)?.name ?? `Category ${id}`;
  const monthlyPoints = (monthly.data?.months ?? []).map((p) => ({
    name: dateLabel(p.month, { month: "short" }),
    income: decimal(p.income),
    expense: decimal(p.expenses),
  }));
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
      <PageHeading
        title="Financial Overview"
        description="Your financial telemetry, performance analytics, and upcoming liquidity schedule."
        actions={
          <>
            <Badge tone="gray">{d?.currency ?? "INR"}</Badge>
            <Button
              disabled={!d}
              icon="file_download"
              onClick={() => {
                if (d)
                  downloadCSV("fintrack-overview.csv", [
                    ["Metric", "Value"],
                    ["Income", d.income],
                    ["Expenses", d.expenses],
                    ["Net Cash Flow", d.balance],
                    ["Portfolio", d.investments.total_asset_value],
                  ]);
              }}
            >
              Export
            </Button>
            <Button
              variant="primary"
              icon="add_circle"
              onClick={() => setTransactionOpen(true)}
            >
              Add Transaction
            </Button>
          </>
        }
      />
      <ApiBoundary query={dashboard}>
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
                    onChange={setPeriod}
                    items={["Monthly", "Quarterly", "Yearly"]}
                  />
                </div>
                <ApiBoundary query={monthly}>
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
              <Card
                title="Budget Overview"
                subtitle={`${dateLabel(d.month, { month: "long" })} · ${amount(d.budget_usage.spent_amount)} spent`}
              >
                <div className="space-y-5">
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
              <Card
                title="Investment Allocation"
                subtitle="Current reported asset snapshots"
              >
                <AllocationChart
                  data={allocation}
                  center={amount(d.investments.total_asset_value)}
                  caption="Current Value"
                />
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
              <Card
                title="Upcoming Obligations"
                subtitle={`As of ${dateLabel(d.as_of)} · Scheduled loans, SIPs, maturities and reminders`}
              >
                <div>
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
            <ApiBoundary query={categories}>
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
                        onChange={(e) => setCategory(e.target.value)}
                      >
                        <option value="">All Categories</option>
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
                  onClick={() => setAdvisory(false)}
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
