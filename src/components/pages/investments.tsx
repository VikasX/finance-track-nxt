"use client";
import { useState } from "react";
import { useFinance } from "../finance-provider";
import {
  selectPortfolioHistory,
  selectPortfolioMix,
  selectSummary,
} from "@/lib/selectors";
import { money, downloadCSV, sum, uid } from "@/lib/finance";
import type { Holding } from "@/types/finance";
import {
  Badge,
  Button,
  Card,
  Metric,
  Modal,
  PageHeading,
  Progress,
  RecordForm,
  Tabs,
} from "../ui/primitives";
import { DataTable, type Column } from "../ui/data-table";
import { FinancialChart } from "../charts";
import { Icon } from "../ui/icon";
export function Investments() {
  const { state, update, notify, month } = useFinance();
  const summary = selectSummary(state, month);
  const [tab, setTab] = useState("All");
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState("1Y");
  const [editor, setEditor] = useState<Holding | null | undefined>();
  const [sell, setSell] = useState<Holding>();
  const [analytics, setAnalytics] = useState<Holding | null | undefined>();
  const rows = state.holdings.filter(
    (h) =>
      (tab === "All" || h.kind === tab) &&
      `${h.name} ${h.symbol}`.toLowerCase().includes(search.toLowerCase()),
  );
  const gain = summary.equity - summary.invested;
  const growth = selectPortfolioHistory(state, period);
  const mix = selectPortfolioMix(state);
  const columns: Column<Holding>[] = [
    {
      key: "name",
      title: "Instrument & Ticker",
      sort: (h) => h.name,
      render: (h) => (
        <div className="entity">
          <span className="entity-icon">{h.symbol.slice(0, 3)}</span>
          <div>
            <strong>{h.name}</strong>
            <small>
              {h.symbol} · {h.kind === "Stock" ? "NSE" : "Direct Growth"}
              {h.sip > 0 && (
                <span className="positive block">SIP {money(h.sip)}/mo</span>
              )}
            </small>
          </div>
        </div>
      ),
    },
    {
      key: "kind",
      title: "Asset Class",
      render: (h) => (
        <Badge tone={h.kind === "Stock" ? "purple" : "gray"}>{h.kind}</Badge>
      ),
    },
    {
      key: "quantity",
      title: "Qty / Units",
      sort: (h) => h.quantity,
      align: "right",
      render: (h) => (
        <span className="font-mono">
          {h.quantity.toLocaleString("en-IN", { maximumFractionDigits: 3 })}
        </span>
      ),
    },
    {
      key: "buy",
      title: "Avg Buy Price",
      sort: (h) => h.buyPrice,
      align: "right",
      render: (h) => (
        <span className="font-mono muted">{money(h.buyPrice, "INR", 2)}</span>
      ),
    },
    {
      key: "price",
      title: "LTP (Current)",
      sort: (h) => h.price,
      align: "right",
      render: (h) => (
        <strong className="font-mono">{money(h.price, "INR", 2)}</strong>
      ),
    },
    {
      key: "invested",
      title: "Invested Value",
      sort: (h) => h.quantity * h.buyPrice,
      align: "right",
      render: (h) => (
        <span className="font-mono muted">
          {money(h.quantity * h.buyPrice)}
        </span>
      ),
    },
    {
      key: "value",
      title: "Current Value",
      sort: (h) => h.quantity * h.price,
      align: "right",
      render: (h) => (
        <strong className="font-mono">{money(h.quantity * h.price)}</strong>
      ),
    },
    {
      key: "gain",
      title: "Unrealized P&L",
      sort: (h) => h.quantity * (h.price - h.buyPrice),
      align: "right",
      render: (h) => (
        <div
          className={`font-mono ${h.price >= h.buyPrice ? "positive" : "negative"}`}
        >
          <strong>
            {h.price >= h.buyPrice ? "+" : ""}
            {money(h.quantity * (h.price - h.buyPrice))}
          </strong>
          <small className="block">
            {(h.buyPrice ? (h.price / h.buyPrice - 1) * 100 : 0).toFixed(2)}%
          </small>
        </div>
      ),
    },
    {
      key: "actions",
      title: "Actions",
      render: (h) => (
        <div className="flex">
          <button
            className="icon-button !text-violet-700"
            aria-label={`Buy ${h.symbol}`}
            onClick={() => setEditor(h)}
          >
            <Icon name="add_circle" size={17} />
          </button>
          <button
            className="icon-button"
            aria-label={`Sell ${h.symbol}`}
            onClick={() => setSell(h)}
          >
            <Icon name="north_east" size={17} />
          </button>
          <button
            className="icon-button"
            aria-label={`Chart ${h.symbol}`}
            onClick={() => setAnalytics(h)}
          >
            <Icon name="trending_up" size={17} />
          </button>
        </div>
      ),
    },
  ];
  return (
    <div className="page-stack">
      <PageHeading
        title="Stocks & Mutual Funds"
        eyebrow="Equities · Active Folio"
        badge="Demo portfolio"
        description="Equity portfolio tracking, SIP allocations, and asset performance telemetry."
        actions={
          <>
            <Button icon="insights" onClick={() => setAnalytics(null)}>
              Analytics & Beta
            </Button>
            <Button
              variant="primary"
              icon="add_circle"
              onClick={() => setEditor(null)}
            >
              Add Investment
            </Button>
          </>
        }
      />
      <div className="metric-grid">
        <Metric
          label="Total Equity Value"
          value={money(summary.equity)}
          icon="account_balance_wallet"
          detail={`Stocks ${money(summary.stocks)} · MFs ${money(summary.funds)}`}
          footer={`Allocation split ${summary.equity ? ((summary.stocks / summary.equity) * 100).toFixed(1) : 0}% / ${summary.equity ? ((summary.funds / summary.equity) * 100).toFixed(1) : 0}%`}
        />
        <Metric
          label="Invested Capital"
          value={money(summary.invested)}
          icon="credit_card"
          detail="Net cash deployed"
          footer={`Active Systematic SIPs: ${money(sum(state.holdings, (h) => h.sip))}/mo`}
        />
        <Metric
          label="Overall Gain (P&L)"
          value={`${gain >= 0 ? "+" : ""}${money(gain)}`}
          icon="trending_up"
          tone={gain >= 0 ? "positive" : "negative"}
          detail={
            <>
              <Badge tone={gain >= 0 ? "green" : "red"}>
                {summary.invested
                  ? ((gain / summary.invested) * 100).toFixed(2)
                  : 0}
                %
              </Badge>{" "}
              All-time ROI
            </>
          }
          footer="Unrealized portfolio return"
        />
        <Metric
          label="Today's Day Gain"
          value="+₹6,420"
          icon="bolt"
          tone="positive"
          detail={
            <>
              <Badge tone="green">↑ +0.66%</Badge>Illustrative daily change
            </>
          }
          footer="Top Contributor RELIANCE (+1.8%)"
        />
      </div>
      <div className="grid-main">
        <Card
          title="Historical Portfolio Growth"
          subtitle="Market value progression versus cumulative capital deployed"
          action={
            <Tabs
              value={period}
              onChange={setPeriod}
              items={["6M", "1Y", "3Y", "ALL"]}
            />
          }
        >
          <FinancialChart type="growth" data={growth} height={300} />
          <div className="info-strip mt-4 flex-wrap">
            <span>
              <i className="inline-block rounded-full w-2 h-2 bg-violet-600 mr-2" />
              Portfolio Valuation ({money(summary.equity)})
            </span>
            <span className="muted">
              — Cumulative Invested ({money(summary.invested)})
            </span>
          </div>
        </Card>
        <Card
          title="Cap & Sector Allocation"
          subtitle="Diversification index across market caps and defensive debt buffers."
          action={<Icon name="pie_chart" />}
        >
          <div className="space-y-5">
            {mix.caps.map((item) => (
              <div key={item.label}>
                <div className="summary-row !text-xs">
                  <span>{item.label}</span>
                  <strong>{item.value.toFixed(1)}%</strong>
                </div>
                <Progress value={item.value} tone={item.tone} />
              </div>
            ))}
          </div>
          <div className="info-strip mt-8 !block">
            <span className="metric-label">Top Sector Exposure</span>
            <div className="flex flex-wrap gap-2 mt-3">
              {mix.sectors.slice(0, 4).map((item) => (
                <span
                  key={item.name}
                  className="bg-white rounded px-2 py-1 text-xs"
                >
                  {item.name}{" "}
                  <strong className="text-violet-700">
                    {item.value.toFixed(0)}%
                  </strong>
                </span>
              ))}
            </div>
          </div>
        </Card>
      </div>
      <DataTable
        rows={rows}
        columns={columns}
        pageSize={6}
        label="monitored equity vehicles"
        toolbar={
          <>
            <Tabs
              value={tab}
              onChange={setTab}
              items={[
                {
                  label: `All Holdings (${state.holdings.length})`,
                  value: "All",
                },
                {
                  label: `Direct Stocks (${state.holdings.filter((h) => h.kind === "Stock").length})`,
                  value: "Stock",
                },
                {
                  label: `Mutual Funds & SIPs (${state.holdings.filter((h) => h.kind === "Mutual Fund").length})`,
                  value: "Mutual Fund",
                },
              ]}
            />
            <div className="filters">
              <label className="search-input">
                <Icon name="filter_list" size={16} />
                <input
                  aria-label="Filter holdings"
                  placeholder="Filter holdings..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              <Button
                icon="file_download"
                onClick={() =>
                  downloadCSV("fintrack-holdings.csv", [
                    [
                      "Instrument",
                      "Symbol",
                      "Units",
                      "Buy Price",
                      "Current Price",
                      "Value",
                    ],
                    ...rows.map((h) => [
                      h.name,
                      h.symbol,
                      h.quantity,
                      h.buyPrice,
                      h.price,
                      h.quantity * h.price,
                    ]),
                  ])
                }
              >
                Export CSV
              </Button>
            </div>
          </>
        }
      />
      <div className="text-right text-xs muted">
        Subtotal Filtered Value:{" "}
        <strong className="font-mono text-violet-700">
          {money(sum(rows, (h) => h.quantity * h.price))}
        </strong>
      </div>
      <Modal
        open={editor !== undefined}
        onClose={() => setEditor(undefined)}
        title="Record Investment"
      >
        <RecordForm
          fields={[
            {
              name: "kind",
              label: "Asset Class",
              type: "select",
              options: ["Stock", "Mutual Fund"],
              value: editor?.kind,
            },
            { name: "symbol", label: "Asset Symbol", value: editor?.symbol },
            {
              name: "name",
              label: "Scheme / Company Name",
              value: editor?.name,
            },
            {
              name: "date",
              label: "Execution Date",
              type: "date",
              value: `${month}-22`,
            },
            {
              name: "quantity",
              label: "Quantity / Units",
              type: "number",
              min: 0.001,
              step: "0.001",
            },
            {
              name: "price",
              label: "Buy Price (₹)",
              type: "number",
              min: 0.01,
              value: editor?.price,
            },
            {
              name: "sip",
              label: "Monthly SIP (₹)",
              type: "number",
              min: 0,
              value: editor?.sip ?? 0,
              required: false,
            },
          ]}
          onCancel={() => setEditor(undefined)}
          submit="Confirm & Add Holding"
          onSave={(values) => {
            const existing = state.holdings.find(
              (h) => h.symbol.toLowerCase() === values.symbol.toLowerCase(),
            );
            const quantity = Number(values.quantity);
            const price = Number(values.price);
            const record: Holding = {
              id: existing?.id ?? uid(),
              name: values.name,
              symbol: values.symbol.toUpperCase(),
              kind: values.kind as Holding["kind"],
              quantity: (existing?.quantity ?? 0) + quantity,
              buyPrice: existing
                ? (existing.quantity * existing.buyPrice + quantity * price) /
                  (existing.quantity + quantity)
                : price,
              price: existing?.price ?? price,
              sip: Number(values.sip ?? 0),
              sector: existing?.sector ?? "Other",
            };
            update((current) => ({
              ...current,
              holdings: existing
                ? current.holdings.map((h) =>
                    h.id === existing.id ? record : h,
                  )
                : [...current.holdings, record],
            }));
            notify("Investment recorded.");
            setEditor(undefined);
          }}
        />
      </Modal>
      <Modal
        open={Boolean(sell)}
        onClose={() => setSell(undefined)}
        title="Sell / Redeem Investment"
      >
        {sell && (
          <>
            <p className="muted text-xs mb-5">
              {sell.name} · {sell.quantity} units available
            </p>
            <RecordForm
              fields={[
                {
                  name: "quantity",
                  label: "Quantity / Units to Redeem",
                  type: "number",
                  min: 0.001,
                  max: sell.quantity,
                  step: "0.001",
                  value: sell.quantity,
                },
                {
                  name: "price",
                  label: "Execution Price (₹)",
                  type: "number",
                  min: 0.01,
                  value: sell.price,
                },
              ]}
              onCancel={() => setSell(undefined)}
              submit="Confirm Redemption"
              onSave={(values) => {
                const quantity = Number(values.quantity);
                update((current) => ({
                  ...current,
                  holdings: current.holdings.flatMap((h) =>
                    h.id !== sell.id
                      ? [h]
                      : h.quantity > quantity
                        ? [{ ...h, quantity: h.quantity - quantity }]
                        : [],
                  ),
                }));
                notify(
                  `Redeemed ${quantity} units for ${money(quantity * Number(values.price))}.`,
                );
                setSell(undefined);
              }}
            />
          </>
        )}
      </Modal>
      <Modal
        open={analytics !== undefined}
        onClose={() => setAnalytics(undefined)}
        title={
          analytics
            ? `${analytics.symbol} Performance`
            : "Portfolio Analytics & Beta"
        }
        wide
      >
        <FinancialChart
          type="growth"
          height={300}
          data={
            analytics
              ? growth.map((p) => ({
                  ...p,
                  value:
                    ((p.value ?? 0) * analytics.quantity * analytics.price) /
                    Math.max(summary.equity, 1),
                }))
              : growth
          }
        />
        <p className="info-strip mt-5">
          Historical chart points illustrate the mock portfolio. Quotes are not
          connected to a market feed.
        </p>
      </Modal>
    </div>
  );
}
