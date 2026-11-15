"use client";
import Link from "next/link";
import { useState } from "react";
import { useFinance } from "../finance-provider";
import { cashTotals, downloadCSV, money, sum } from "@/lib/finance";
import { selectSummary } from "@/lib/selectors";
import { downloadExcel, downloadPDF, downloadReportPack } from "@/lib/export";
import {
  Badge,
  Button,
  Card,
  Metric,
  Modal,
  PageHeading,
  Tabs,
} from "../ui/primitives";
import { AllocationChart, CHART_COLORS, FinancialChart } from "../charts";
import { Icon } from "../ui/icon";
export function Reports() {
  const { state, month } = useFinance();
  const summary = selectSummary(state, month);
  const [range, setRange] = useState("YTD (Jan - Oct 2024)");
  const [category, setCategory] = useState("All Categories");
  const [account, setAccount] = useState("All Accounts");
  const [directOnly, setDirectOnly] = useState(true);
  const [comparison, setComparison] = useState("vs Prev Month");
  const [preview, setPreview] = useState<string>();
  const rangeBounds = range.startsWith("Q3")
    ? ["2024-07-01", "2024-09-30"]
    : range === "Last 6 Months"
      ? ["2024-05-01", "2024-10-31"]
      : range === "Full FY 2023–24"
        ? ["2023-04-01", "2024-03-31"]
        : ["2024-01-01", "2024-10-31"];
  const transactions = state.transactions.filter(
    (t) =>
      t.date >= rangeBounds[0] &&
      t.date <= rangeBounds[1] &&
      (category === "All Categories" ||
        t.category === category ||
        t.kind === "income") &&
      (account === "All Accounts" || t.channel === account),
  );
  const totals = cashTotals(transactions);
  const outflows = transactions.filter((t) =>
    directOnly ? t.kind === "expense" : t.kind !== "income",
  );
  const totalOut = sum(outflows, (t) => t.amount);
  const categoryData = Array.from(new Set(outflows.map((t) => t.category)))
    .map((name) => ({
      name,
      value: sum(
        outflows.filter((t) => t.category === name),
        (t) => t.amount,
      ),
    }))
    .sort((a, b) => b.value - a.value);
  const dates = Array.from(
    new Set(transactions.map((t) => t.date.slice(0, 7))),
  ).sort();
  const chart = dates.map((prefix) => ({
    name: new Date(`${prefix}-01T12:00:00`).toLocaleDateString("en-IN", {
      month: "short",
    }),
    income: sum(
      transactions.filter(
        (t) => t.date.startsWith(prefix) && t.kind === "income",
      ),
      (t) => t.amount,
    ),
    expense: sum(
      outflows.filter((t) => t.date.startsWith(prefix)),
      (t) => t.amount,
    ),
  }));
  const priorPrefix = comparison === "vs Last Year" ? "2023-10" : "2024-09";
  const prior = cashTotals(
    state.transactions.filter((t) => t.date.startsWith(priorPrefix)),
  );
  const difference = prior.expense
    ? (summary.expense / prior.expense - 1) * 100
    : null;
  const reportRows: (string | number)[][] = [
    ["Date", "Entity", "Category", "Account", "Kind", "Amount INR"],
    ...transactions.map((t) => [
      t.date,
      t.name,
      t.category,
      t.channel,
      t.kind,
      t.amount,
    ]),
  ];
  const heatmap = Array.from({ length: 4 }, (_, week) =>
    Array.from({ length: 7 }, (_, weekday) => {
      const day = week * 7 + weekday + 1;
      return sum(
        outflows.filter(
          (t) => t.date.startsWith(month) && Number(t.date.slice(8)) === day,
        ),
        (t) => t.amount,
      );
    }),
  );
  const maxHeat = Math.max(1, ...heatmap.flat());
  const statementRows: (string | number)[][] = [
    ["Metric", "Value INR"],
    ["Income", totals.income],
    ["Expenses", totalOut],
    ["Surplus", totals.income - totalOut],
    ["PPF Contributions", summary.contribution],
    ["Portfolio Current Value", summary.portfolio],
    ["Loan Outstanding", sum(state.loans, (l) => l.principal)],
  ];
  return (
    <div className="page-stack">
      <PageHeading
        title="Reports & Analytics"
        eyebrow="Intelligence Center"
        badge="Fiscal Year 2024–25"
        description="Deep financial telemetry, tax projections, spending heatmaps, and downloadable fiscal statements."
        actions={
          <>
            <select
              className="filter-select"
              aria-label="Report date range"
              value={range}
              onChange={(e) => setRange(e.target.value)}
            >
              {[
                "YTD (Jan - Oct 2024)",
                "Q3 2024 (Jul - Sep)",
                "Last 6 Months",
                "Full FY 2023–24",
              ].map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
            <Button
              icon="file_download"
              onClick={() =>
                downloadPDF(
                  "fintrack-report.pdf",
                  `Financial Report: ${range}`,
                  statementRows,
                )
              }
            >
              Export PDF
            </Button>
            <Button
              icon="download"
              onClick={() => downloadCSV("fintrack-report.csv", reportRows)}
            >
              Export CSV
            </Button>
          </>
        }
      />
      <Card className="!p-4">
        <div className="filters">
          <Icon name="tune" size={16} />
          <select
            aria-label="Report category"
            className="filter-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option>All Categories</option>
            {state.categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select
            aria-label="Report account"
            className="filter-select"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
          >
            <option>All Accounts</option>
            {Array.from(new Set(state.transactions.map((t) => t.channel))).map(
              (c) => (
                <option key={c}>{c}</option>
              ),
            )}
          </select>
          <label className="flex gap-2 items-center text-xs muted">
            <input
              type="checkbox"
              checked={directOnly}
              onChange={(e) => setDirectOnly(e.target.checked)}
            />
            Direct Outflows Only
          </label>
          <span className="text-[10px] muted">Multi-currency: INR (₹)</span>
          <div className="ml-auto">
            <Tabs
              value={comparison}
              onChange={setComparison}
              items={["vs Prev Month", "vs Last Year"]}
            />
          </div>
        </div>
      </Card>
      <div className="metric-grid">
        <Metric
          label="Annual Savings Rate"
          value={`${totals.savingsRate.toFixed(1)}%`}
          icon="savings"
          detail={
            <Badge tone={totals.savingsRate > 50 ? "green" : "amber"}>
              Target Benchmark &gt; 50.0%
            </Badge>
          }
        />
        <Metric
          label="Avg. Monthly Spend"
          value={money(totalOut / Math.max(dates.length, 1))}
          icon="receipt_long"
          detail={
            difference === null
              ? "No prior-year data to compare"
              : `${difference >= 0 ? "+" : ""}${difference.toFixed(1)}% vs previous month`
          }
        />
        <Metric
          label="Top Outflow Category"
          value={
            <span className="!font-sans text-base tracking-normal">
              {categoryData[0]?.name ?? "No spending"}
            </span>
          }
          icon="restaurant"
          detail={`Volumetric Share ${totalOut && categoryData[0] ? ((categoryData[0].value / totalOut) * 100).toFixed(1) : 0}% of total outflow`}
        />
        <Metric
          label="Projected FY Tax Savings"
          value={money(Math.min(summary.contribution, 150000) * 0.3)}
          icon="shield"
          detail="Illustrative 30% deduction scenario"
          footer="Not a tax calculation or filing advice"
        />
      </div>
      <div className="grid-main">
        <Card
          title="Cash Inflow vs Outflow"
          subtitle={`${dates.length} Months · Net operational surplus visualized`}
          action={<Badge tone="gray">{range}</Badge>}
        >
          <FinancialChart data={chart} height={310} showSurplus />
          <div className="info-strip green mt-4">
            Net Surplus:{" "}
            <strong className="font-mono">
              {money(totals.income - totalOut)}
            </strong>
          </div>
        </Card>
        <Card
          title="Category Outflow"
          subtitle="Aggregate split across active ledgers"
        >
          <AllocationChart
            data={categoryData}
            center={money(totalOut)}
            caption="Total Outflow"
            height={235}
          />
          {categoryData.map((item, index) => (
            <div className="legend-row" key={item.name}>
              <span
                className="legend-dot"
                style={{
                  background: CHART_COLORS[index % CHART_COLORS.length],
                }}
              />
              <span className="text-[11px]">{item.name}</span>
              <strong>
                {money(item.value)}{" "}
                <span className="muted font-normal">
                  {totalOut ? ((item.value / totalOut) * 100).toFixed(1) : 0}%
                </span>
              </strong>
            </div>
          ))}
        </Card>
      </div>
      <Card
        title="Spending Velocity Heatmap"
        subtitle="Intensity matrix showing distribution across seven-day cycles of the selected month."
        action={
          <div className="flex gap-1 items-center text-[10px] muted">
            <span>Low Velocity</span>
            {[0.05, 0.2, 0.4, 0.7, 1].map((value) => (
              <i
                key={value}
                style={{ background: `rgba(124,58,237,${value})` }}
                className="w-3 h-3 rounded-sm"
              />
            ))}
            <span>High Outflow</span>
          </div>
        }
      >
        <div className="heatmap-scroll">
          <div className="heatmap">
            <span className="muted">Cycle / Day</span>
            {[
              "Day 1",
              "Day 2",
              "Day 3",
              "Day 4",
              "Day 5",
              "Day 6",
              "Day 7",
            ].map((day) => (
              <span key={day} className="text-center muted">
                {day}
              </span>
            ))}
            {heatmap.map((week, index) => (
              <div className="contents" key={index}>
                <strong>
                  Week {index + 1} ({index * 7 + 1}–{index * 7 + 7})
                </strong>
                {week.map((value, day) => (
                  <div
                    key={day}
                    className="heatmap-cell"
                    title={`${month}-${String(index * 7 + day + 1).padStart(2, "0")}: ${money(value)}`}
                    style={{
                      background: `rgba(124,58,237,${0.045 + (value / maxHeat) * 0.9})`,
                      color: value / maxHeat > 0.5 ? "white" : "var(--accent)",
                    }}
                  >
                    {money(value)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </Card>
      <div className="flex justify-between items-center">
        <div>
          <h2 className="flex gap-2 items-center">
            <Icon name="auto_awesome" className="text-violet-600" />
            AI Financial Insights & Anomalies
          </h2>
          <p className="muted text-xs mt-1">
            Illustrative insights based on your demo ledger
          </p>
        </div>
        <Badge tone="gray">Local analysis</Badge>
      </div>
      <div className="insights-grid">
        {[
          {
            icon: "warning",
            label: "Spiking Outflow",
            title: "Weekend Dining Surge",
            text: "Review your food delivery and restaurant transactions to keep discretionary spending within your monthly envelope.",
            action: "Set weekend budget cap",
            href: "/budgets",
            value: money(
              summary.budgets.find((b) => b.id === "food")?.spent ?? 0,
            ),
          },
          {
            icon: "bolt",
            label: "Consumption Alert",
            title: "Utility Price Deviation",
            text: "Utility and telecom charges are nearing the current envelope limit. Compare entries before adjusting the next cycle.",
            action: "Compare utility entries",
            href: "/income-expenses",
            value: money(
              summary.budgets.find((b) => b.id === "bills")?.spent ?? 0,
            ),
          },
          {
            icon: "trending_up",
            label: "Milestone Paced",
            title: "Accelerated Wealth Growth",
            text: "Your portfolio includes equity, mutual funds, fixed deposits, and sovereign savings. Review the current allocation.",
            action: "Adjust annual rebalancing",
            href: "/stocks-investments",
            value: money(summary.portfolio),
          },
        ].map((item) => (
          <Card key={item.title}>
            <div className="flex justify-between items-center">
              <Icon name={item.icon} className="text-violet-600" />
              <Badge tone="gray">{item.label}</Badge>
            </div>
            <h3 className="mt-4">{item.title}</h3>
            <p className="muted text-xs leading-6 mt-2">{item.text}</p>
            <strong className="block font-mono text-lg mt-4">
              {item.value}
            </strong>
            <Link
              href={item.href}
              className="text-xs font-semibold text-violet-700 block mt-5"
            >
              {item.action} →
            </Link>
          </Card>
        ))}
      </div>
      <Card
        title="Downloadable Fiscal Statements"
        subtitle="Personal reports for reviewing your finances and preparing supporting records."
        action={
          <Link href="/settings" className="text-xs text-violet-700">
            Manage statement schedules ⚙
          </Link>
        }
      >
        <div className="insights-grid">
          {[
            {
              title: "Monthly Ledger Statement",
              icon: "account_balance_wallet",
              description:
                "Comprehensive transaction record with account channels, amounts, and dates.",
              format: "PDF",
              action: "Get PDF",
            },
            {
              title: "Annual Tax Pack",
              icon: "receipt_long",
              description:
                "Contribution and portfolio summaries for reviewing your annual financial records.",
              format: "ZIP (PDF + CSV)",
              action: "Download Pack",
            },
            {
              title: "Net Worth Audit Trail",
              icon: "receipt_long",
              description:
                "Valuation of mutual funds, direct equities, fixed deposits, and liabilities.",
              format: "Excel",
              action: "Download XLS",
            },
          ].map((item) => (
            <div className="statement-card" key={item.title}>
              <span className="entity-icon">
                <Icon name={item.icon} />
              </span>
              <h3 className="mt-4 !text-sm">{item.title}</h3>
              <p className="muted text-[11px] leading-5 mt-2 flex-1">
                {item.description}
              </p>
              <div className="text-[10px] muted flex justify-between my-4">
                <span>Demo Statement</span>
                <span>{item.format}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  icon="visibility"
                  className="flex-1"
                  onClick={() => setPreview(item.title)}
                >
                  Preview
                </Button>
                <Button
                  variant="primary"
                  icon="download"
                  onClick={() =>
                    item.format === "PDF"
                      ? downloadPDF(
                          "fintrack-ledger.pdf",
                          item.title,
                          reportRows,
                        )
                      : item.format === "Excel"
                        ? downloadExcel("fintrack-net-worth.xml", statementRows)
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
      <Modal
        open={Boolean(preview)}
        onClose={() => setPreview(undefined)}
        title={preview ?? "Statement Preview"}
        wide
      >
        <p className="muted text-xs mb-5">
          Preview of your locally generated demo statement.
        </p>
        <div className="table-scroll">
          <table>
            <tbody>
              {(preview === "Monthly Ledger Statement"
                ? reportRows
                : statementRows
              ).map((row, index) => (
                <tr key={index}>
                  {row.map((cell, col) => (
                    <td key={col}>{String(cell)}</td>
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
