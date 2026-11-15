"use client";
import Link from "next/link";
import { useState } from "react";
import { useFinance } from "../finance-provider";
import { selectSummary } from "@/lib/selectors";
import { cashTotals, dateLabel, downloadCSV, money, sum } from "@/lib/finance";
import {
  Badge,
  Button,
  Card,
  Metric,
  PageHeading,
  Progress,
  Tabs,
} from "../ui/primitives";
import { FinancialChart, AllocationChart, CHART_COLORS } from "../charts";
import { TransactionTable } from "../transaction-table";
import { Icon } from "../ui/icon";
export function Dashboard() {
  const { state, month, setTransactionOpen } = useFinance();
  const summary = selectSummary(state, month);
  const [period, setPeriod] = useState("Monthly");
  const [advisory, setAdvisory] = useState(true);
  const [category, setCategory] = useState("All Categories");
  const cashflow =
    period === "Monthly"
      ? summary.cashflow
      : period === "Quarterly"
        ? Array.from(
            { length: Math.ceil(summary.cashflow.length / 3) },
            (_, i) => ({
              name: `Q${i + 1}`,
              income: sum(
                summary.cashflow.slice(i * 3, i * 3 + 3),
                (p) => p.income,
              ),
              expense: sum(
                summary.cashflow.slice(i * 3, i * 3 + 3),
                (p) => p.expense,
              ),
            }),
          )
        : [
            {
              name: month.slice(0, 4),
              income: sum(summary.cashflow, (p) => p.income),
              expense: sum(summary.cashflow, (p) => p.expense),
            },
          ];
  const recent = [...summary.transactions]
    .filter((t) => category === "All Categories" || t.category === category)
    .sort((a, b) => b.date.localeCompare(a.date));
  const previousMonth = `${month.slice(0, 4)}-${String(Number(month.slice(5)) - 1).padStart(2, "0")}`;
  const previous = cashTotals(
    state.transactions.filter((t) => t.date.startsWith(previousMonth)),
  );
  const change = previous.income
    ? (summary.income / previous.income - 1) * 100
    : 0;
  return (
    <div className="page-stack">
      <PageHeading
        title="Financial Overview"
        description="Your complete financial telemetry, performance analytics, and automated liquidity schedule."
        actions={
          <>
            <Badge tone="gray">INR ₹</Badge>
            <Button
              icon="file_download"
              onClick={() =>
                downloadCSV("fintrack-overview.csv", [
                  ["Metric", "Value"],
                  ["Income", summary.income],
                  ["Expenses", summary.expense],
                  ["Net saved", summary.net],
                  ["Portfolio", summary.portfolio],
                ])
              }
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
      <div className="metric-grid">
        <Metric
          label="Total Net Balance"
          value={money(summary.cashBalance)}
          icon="account_balance"
          detail={
            <>
              <Badge tone="green">↗ +12.4%</Badge> vs Sep
            </>
          }
        />
        <Metric
          label="Monthly Inflow"
          value={money(summary.income)}
          icon="south_west"
          detail={
            <>
              <Badge tone="green">↑ {change.toFixed(1)}%</Badge> vs previous
              month
            </>
          }
        />
        <Metric
          label="Monthly Outflow"
          value={money(summary.expense)}
          icon="north_east"
          detail={
            <>
              <Badge tone="green">↓ −4.1%</Badge> outflow rate
            </>
          }
          footer={`${summary.income ? ((summary.expense / summary.income) * 100).toFixed(1) : "0"}% spend ratio`}
        />
        <Metric
          label="Total Portfolio"
          value={money(summary.portfolio)}
          icon="insights"
          detail={<Badge tone="green">↗ +18.6% CAGR</Badge>}
        />
      </div>
      <div className="grid-main">
        <Card
          title="Cash Flow Overview"
          subtitle="Monthly recurring delta between verified credit entries and debit entries"
          action={<Badge tone="green">+{money(summary.net)} Net Saved</Badge>}
        >
          <div className="flex justify-end mb-5">
            <Tabs
              value={period}
              onChange={setPeriod}
              items={["Monthly", "Quarterly", "Yearly"]}
            />
          </div>
          <FinancialChart data={cashflow} height={285} />
          <div className="info-strip mt-5 flex-wrap">
            <span>
              Avg Savings Ratio:{" "}
              <strong className="positive">
                {summary.savingsRate.toFixed(1)}%
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
          subtitle={`${dateLabel(`${month}-01`, { month: "long" })} Spending Utilization (${money(summary.budgetSpent)} spent)`}
          action={
            <Link href="/budgets" aria-label="Manage budgets">
              <Icon name="more_vert" />
            </Link>
          }
        >
          <div className="space-y-5">
            {summary.budgets.map((b) => (
              <div key={b.id}>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="flex gap-2 items-center">
                    <Icon name={b.icon} size={15} />
                    {b.name.replace(" & Retail", "").replace(" & Leisure", "")}
                  </span>
                  <span className="font-mono text-[10px]">
                    {money(b.spent)} / {money(b.limit)}
                  </span>
                </div>
                <div className="flex gap-3 items-center">
                  <div className="flex-1">
                    <Progress
                      value={(b.spent / b.limit) * 100}
                      tone={b.spent / b.limit > 0.9 ? "amber" : "purple"}
                    />
                  </div>
                  <span className="muted text-[10px] w-7">
                    {((b.spent / b.limit) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="split-line" />
          <div className="flex items-center justify-between text-xs">
            <span className="muted">
              Total Cap: {money(summary.budgetLimit)}
            </span>
            <Link className="text-violet-700 font-semibold" href="/budgets">
              Manage Budgets
            </Link>
          </div>
        </Card>
      </div>
      <div className="grid-halves">
        <Card
          title="Investment Allocation"
          subtitle="Asset diversification portfolio and returns"
          action={<Badge tone="green">+22.5%</Badge>}
        >
          <div className="allocation-layout">
            <AllocationChart
              data={summary.allocation}
              center={money(summary.portfolio)}
              caption="Current Value"
            />
            {summary.allocation.map((item, index) => (
              <div className="legend-row" key={item.name}>
                <span
                  className="legend-dot"
                  style={{ background: CHART_COLORS[index] }}
                />
                {item.name}
                <strong>{money(item.value)}</strong>
              </div>
            ))}
          </div>
          <div className="split-line" />
          <Link
            href="/stocks-investments"
            className="text-xs font-semibold text-violet-700 flex items-center justify-between"
          >
            Manage Investments
            <Icon name="arrow_forward" size={16} />
          </Link>
        </Card>
        <Card
          title="Upcoming Obligations"
          subtitle="Scheduled EMIs, SIPs, and maturity credits"
          action={<Icon name="calendar_month" />}
        >
          <div className="space-y-1">
            {state.events
              .filter((e) => !e.paid)
              .sort((a, b) => a.date.localeCompare(b.date))
              .slice(0, 4)
              .map((event) => (
                <div
                  className="flex items-center gap-3 border-b border-slate-100 py-4"
                  key={event.id}
                >
                  <div className="event-date">
                    <small>{dateLabel(event.date, { month: "short" })}</small>
                    <strong>{event.date.slice(8)}</strong>
                  </div>
                  <div className="min-w-0">
                    <strong className="text-xs block">{event.title}</strong>
                    <small className="muted text-[10px]">
                      {event.description}
                    </small>
                  </div>
                  <div className="ml-auto text-right">
                    <strong
                      className={`font-mono text-xs whitespace-nowrap ${event.category === "Maturity" || event.category === "Income" ? "positive" : ""}`}
                    >
                      {money(event.amount)}
                    </strong>
                    <div className="mt-1">
                      <Badge
                        tone={event.category === "Maturity" ? "green" : "gray"}
                      >
                        {event.category.split(" /")[0]}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
          </div>
          <Link
            href="/calendar"
            className="text-xs font-semibold text-violet-700 block mt-5 text-right"
          >
            View All Reminders →
          </Link>
        </Card>
      </div>
      <TransactionTable
        compact
        rows={recent}
        toolbar={
          <>
            <div>
              <h2>Recent Transactions</h2>
              <p className="muted text-xs mt-1">
                Ledger updates across linked bank accounts and credit lines
              </p>
            </div>
            <div className="filters">
              <select
                className="filter-select"
                aria-label="Recent transaction category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option>All Categories</option>
                {state.categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <Link
                href="/income-expenses"
                className="text-violet-700 text-xs font-semibold"
              >
                View All Transactions →
              </Link>
            </div>
          </>
        }
      />
      {advisory && (
        <div className="advisory">
          <Icon name="smart_toy" size={28} />
          <div>
            <h3>FinTrack Intelligence Advisory</h3>
            <p>
              You have {money(summary.net)} of monthly surplus. Review your
              investment allocation and upcoming obligations before putting idle
              cash to work.
            </p>
          </div>
          <Link href="/stocks-investments" className="button button-primary">
            Review Allocation
          </Link>
          <button
            className="icon-button"
            aria-label="Dismiss advisory"
            onClick={() => setAdvisory(false)}
          >
            <Icon name="close" />
          </button>
        </div>
      )}
    </div>
  );
}
