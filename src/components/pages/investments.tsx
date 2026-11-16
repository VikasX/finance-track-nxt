"use client";
import { useAmount } from "../use-amount";

import { useState } from "react";
import type { InvestmentRead } from "@/types/api";
import { mutate, useApi } from "@/lib/api-cache";
import { decimal, percent, total } from "@/lib/api-format";
import { downloadCSV } from "@/lib/finance";
import { useFinance } from "../finance-provider";
import { ResourceEditor } from "../resource-editor";
import { ApiBoundary } from "../ui/api-boundary";
import {
  Badge,
  Button,
  Card,
  ConfirmDelete,
  EmptyState,
  Metric,
  Modal,
  PageHeading,
  RecordForm,
  Tabs,
} from "../ui/primitives";
import { DataTable, type Column } from "../ui/data-table";
import { AllocationChart, CHART_COLORS } from "../charts";
import { Icon } from "../ui/icon";
export function Investments() {
  const amount = useAmount();
  const { month, notify } = useFinance();
  const query = useApi<InvestmentRead[]>("all:/api/investments");
  const [tab, setTab] = useState("All");
  const [search, setSearch] = useState("");
  const [editor, setEditor] = useState<InvestmentRead | null | undefined>();
  const [deleting, setDeleting] = useState<InvestmentRead>();
  const [sell, setSell] = useState<InvestmentRead>();
  const [analytics, setAnalytics] = useState(false);
  const rows = query.data ?? [];
  const visible = rows.filter(
    (r) =>
      (tab === "All" || r.asset_type === tab) &&
      `${r.name} ${r.symbol ?? ""}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const invested = total(rows.map((r) => r.invested_value));
  const value = total(rows.map((r) => r.current_value));
  const gain = total(rows.map((r) => r.gain_loss));
  const mix = [
    {
      name: "Direct Stocks",
      value: decimal(
        total(
          rows
            .filter((r) => r.asset_type === "stock")
            .map((r) => r.current_value),
        ),
      ),
    },
    {
      name: "Mutual Funds",
      value: decimal(
        total(
          rows
            .filter((r) => r.asset_type === "mutual_fund")
            .map((r) => r.current_value),
        ),
      ),
    },
  ];
  const columns: Column<InvestmentRead>[] = [
    {
      key: "name",
      title: "Instrument & Ticker",
      sort: (r) => r.name,
      render: (r) => (
        <div className="entity">
          <span className="entity-icon">
            {(r.symbol ?? r.name).slice(0, 3)}
          </span>
          <div>
            <strong>{r.name}</strong>
            <small>
              {r.symbol ?? "Mutual Fund"}
              {decimal(r.monthly_sip) > 0 && (
                <span className="positive block">
                  SIP {amount(r.monthly_sip)}/mo
                </span>
              )}
            </small>
          </div>
        </div>
      ),
    },
    {
      key: "type",
      title: "Asset Class",
      render: (r) => (
        <Badge tone={r.asset_type === "stock" ? "purple" : "gray"}>
          {r.asset_type.replaceAll("_", " ")}
        </Badge>
      ),
    },
    {
      key: "qty",
      title: "Qty / Units",
      sort: (r) => decimal(r.quantity),
      align: "right",
      render: (r) => <span className="font-mono">{r.quantity}</span>,
    },
    {
      key: "buy",
      title: "Avg Buy Price",
      sort: (r) => decimal(r.average_buy_price),
      align: "right",
      render: (r) => (
        <span className="font-mono muted">
          {amount(r.average_buy_price, "INR", 2)}
        </span>
      ),
    },
    {
      key: "price",
      title: "Current Price",
      sort: (r) => decimal(r.current_price),
      align: "right",
      render: (r) => (
        <strong className="font-mono">
          {amount(r.current_price, "INR", 2)}
        </strong>
      ),
    },
    {
      key: "invested",
      title: "Invested Value",
      sort: (r) => decimal(r.invested_value),
      align: "right",
      render: (r) => (
        <span className="font-mono">{amount(r.invested_value)}</span>
      ),
    },
    {
      key: "value",
      title: "Current Value",
      sort: (r) => decimal(r.current_value),
      align: "right",
      render: (r) => (
        <strong className="font-mono">{amount(r.current_value)}</strong>
      ),
    },
    {
      key: "gain",
      title: "Unrealized P&L",
      sort: (r) => decimal(r.gain_loss),
      align: "right",
      render: (r) => (
        <div
          className={`font-mono ${decimal(r.gain_loss) >= 0 ? "positive" : "negative"}`}
        >
          <strong>{amount(r.gain_loss)}</strong>
          <small className="block">{percent(r.gain_loss_percent, 2)}</small>
        </div>
      ),
    },
    {
      key: "actions",
      title: "Actions",
      render: (r) => (
        <div className="flex">
          <button
            className="icon-button"
            aria-label={`Edit ${r.name}`}
            onClick={() => setEditor(r)}
          >
            <Icon name="edit" size={15} />
          </button>
          <button
            className="icon-button"
            aria-label={`Sell ${r.name}`}
            onClick={() => setSell(r)}
          >
            <Icon name="north_east" size={15} />
          </button>
          <button
            className="icon-button"
            aria-label={`Delete ${r.name}`}
            onClick={() => setDeleting(r)}
          >
            <Icon name="delete" size={15} />
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
        badge="API Connected"
        description="Investment snapshots, SIP schedules, and portfolio performance."
        actions={
          <>
            <Button icon="insights" onClick={() => setAnalytics(true)}>
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
      <ApiBoundary query={query}>
        <div className="metric-grid">
          <Metric
            label="Total Equity Value"
            value={amount(value)}
            icon="account_balance_wallet"
            detail={`${rows.length} recorded holdings`}
          />
          <Metric
            label="Invested Capital"
            value={amount(invested)}
            icon="credit_card"
            detail="Reported cost basis"
          />
          <Metric
            label="Overall Gain (P&L)"
            value={amount(gain)}
            icon="trending_up"
            tone={decimal(gain) >= 0 ? "positive" : "negative"}
            detail={
              decimal(invested) > 0
                ? `${((decimal(gain) / decimal(invested)) * 100).toFixed(2)}% return`
                : "Return unavailable"
            }
          />
          <Metric
            label="Active Monthly SIPs"
            value={amount(total(rows.map((r) => r.monthly_sip)))}
            icon="savings"
            detail={`${rows.filter((r) => decimal(r.monthly_sip) > 0).length} scheduled funds`}
          />
        </div>
        <div className="grid-main">
          <Card
            title="Historical Portfolio Growth"
            subtitle="Market value progression versus cumulative invested capital"
          >
            <EmptyState text="Historical prices and benchmark data are not available from the API. Current valuations are shown below." />
          </Card>
          <Card
            title="Asset Allocation"
            subtitle="Current reported stock and mutual fund values"
          >
            <AllocationChart
              data={mix}
              center={amount(value)}
              caption="Current Value"
            />
            {mix.map((r, i) => (
              <div className="legend-row" key={r.name}>
                <span
                  className="legend-dot"
                  style={{ background: CHART_COLORS[i] }}
                />
                {r.name}
                <strong>{amount(r.value)}</strong>
              </div>
            ))}
          </Card>
        </div>
        <DataTable
          rows={visible}
          columns={columns}
          pageSize={6}
          label="holdings"
          toolbar={
            <>
              <Tabs
                value={tab}
                onChange={setTab}
                items={[
                  { value: "All", label: `All Holdings (${rows.length})` },
                  { value: "stock", label: "Direct Stocks" },
                  { value: "mutual_fund", label: "Mutual Funds & SIPs" },
                ]}
              />
              <div className="filters">
                <label className="search-input">
                  <Icon name="filter_list" />
                  <input
                    aria-label="Filter holdings"
                    placeholder="Filter holdings..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
                <Button
                  icon="download"
                  onClick={() =>
                    downloadCSV("fintrack-holdings.csv", [
                      [
                        "Name",
                        "Symbol",
                        "Quantity",
                        "Buy Price",
                        "Current Price",
                        "Invested Value",
                        "Current Value",
                        "P&L",
                      ],
                      ...visible.map((r) => [
                        r.name,
                        r.symbol ?? "",
                        r.quantity,
                        r.average_buy_price,
                        r.current_price,
                        r.invested_value,
                        r.current_value,
                        r.gain_loss,
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
          Filtered Value:{" "}
          <strong className="font-mono text-violet-700">
            {amount(total(visible.map((r) => r.current_value)))}
          </strong>
        </div>
      </ApiBoundary>
      {editor !== undefined && (
        <ResourceEditor
          path="/api/investments"
          record={editor ?? undefined}
          title={editor ? "Edit Investment" : "Record Investment"}
          defaults={{
            asset_type: "stock",
            purchase_date: `${month}-22`,
            monthly_sip: "0",
          }}
          onClose={() => setEditor(undefined)}
        />
      )}
      <ConfirmDelete
        key={deleting?.id ?? "none"}
        open={Boolean(deleting)}
        onClose={() => setDeleting(undefined)}
        onConfirm={async () => {
          if (deleting)
            await mutate(`/api/investments/${deleting.id}`, "DELETE");
        }}
      />
      {sell && (
        <Modal
          open
          title="Sell / Redeem Investment"
          onClose={() => setSell(undefined)}
        >
          <p className="muted text-xs mb-5">
            {sell.name} · {sell.quantity} units available. This updates the
            holding snapshot; no ledger transaction is created automatically.
          </p>
          <RecordForm
            fields={[
              {
                name: "quantity",
                label: "Quantity / Units to Redeem",
                type: "number",
                min: 0.000001,
                max: decimal(sell.quantity),
                step: "any",
                value: sell.quantity,
              },
            ]}
            onCancel={() => setSell(undefined)}
            submit="Confirm Redemption"
            onSave={async (v) => {
              const remaining = total([sell.quantity, `-${v.quantity}`]);
              if (decimal(remaining) < 0)
                throw new Error(
                  "Cannot redeem more than the available quantity.",
                );
              await mutate(
                `/api/investments/${sell.id}`,
                decimal(remaining) === 0 ? "DELETE" : "PATCH",
                decimal(remaining) === 0 ? undefined : { quantity: remaining },
              );
              setSell(undefined);
              notify("Holding updated.");
            }}
          />
        </Modal>
      )}
      <Modal
        open={analytics}
        title="Portfolio Analytics & Beta"
        onClose={() => setAnalytics(false)}
      >
        <EmptyState text="Historical returns, sector classifications, and benchmark beta are not exposed by the current API." />
      </Modal>
    </div>
  );
}
