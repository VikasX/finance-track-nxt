/*
 * src/components/pages/investments.tsx
 * Loads investment holdings, sums returned decimal valuations, and prepares table/allocation views. A partial redemption PATCHes quantity; full redemption DELETEs the holding, without creating ledger entries.
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
import type { InvestmentRead } from "@/types/api";
// Reuse the shared read cache/write flow. useApi supplies reactive request state; successful mutate calls invalidate cached data so subscribed screens refresh.
import { mutate, useApi } from "@/lib/api-cache";
// Reuse decimal/date adapters. Money remains a string at the API boundary; exact totals and display/chart conversion have separate responsibilities.
import { decimal, percent, total } from "@/lib/api-format";
// Reuse formatting, local calculator, or download helpers. These utilities do not perform backend writes.
import { downloadCSV } from "@/lib/finance";
// Read shared UI context for the selected month, global transaction dialog, or toast messages. Financial records still come from API hooks.
import { useFinance } from "../finance-provider";
// Use the common schema-based create/edit dialog; it owns writable payload construction and delegates input rendering to RecordForm.
import { ResourceEditor } from "../resource-editor";
// Use the common loading/error/retry wrapper, keeping request failure visibly different from an empty successful response.
import { ApiBoundary } from "../ui/api-boundary";
// Import the shared styled UI pieces rather than repeating button/card/dialog/form markup. Their props let this screen supply content and event callbacks.
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
// Use a shared table plus typed column definitions; this file supplies rows/cell renderers while the table handles sorting and pagination controls.
import { DataTable, type Column } from "../ui/data-table";
// Use shared chart components/palette. This caller prepares the data; the chart only renders it.
import { AllocationChart, CHART_COLORS } from "../charts";
// Resolve existing design icon names through the shared Lucide mapping, keeping icon rendering consistent.
import { Icon } from "../ui/icon";
// Render the Investments screen. Read API data first, derive display rows, then return JSX; props/state determine which controls and dialogs are visible.
export function Investments() {
  // Get the shared currency formatter; its settings read is deduplicated by the API cache.
  const amount = useAmount();
  // Destructure shared UI values and setters from FinanceProvider. Object braces select named properties; they do not create independent copies of the underlying state.
  const { month, notify } = useFinance();
  // Subscribe query to this API key. The type inside <...> describes the returned data; loading/error/retry travel with it. A changed URL selects a new cached request, and null skips the read.
  const query = useApi<InvestmentRead[]>("all:/api/investments");
  // React state stores the selected tab; its value drives the displayed/filtered content. The setter (second array value) schedules a rerender when a control/event changes it; ordinary local variables would reset on each render.
  const [tab, setTab] = useState("All");
  // React state stores the input text immediately, before its debounced value triggers a server search. The setter (second array value) schedules a rerender when a control/event changes it; ordinary local variables would reset on each render.
  const [search, setSearch] = useState("");
  // The editor selection uses three states: undefined closes it, null opens creation, and a record opens editing. This distinction lets one form support both POST and PATCH.
  const [editor, setEditor] = useState<InvestmentRead | null | undefined>();
  // Remember the record chosen for deletion so the confirmation dialog can target it. Clearing the selection closes the dialog.
  const [deleting, setDeleting] = useState<InvestmentRead>();
  // React state stores the holding selected for partial/full redemption. The setter (second array value) schedules a rerender when a control/event changes it; ordinary local variables would reset on each render.
  const [sell, setSell] = useState<InvestmentRead>();
  // React state stores whether the investment analytics explanation is open. The setter (second array value) schedules a rerender when a control/event changes it; ordinary local variables would reset on each render.
  const [analytics, setAnalytics] = useState(false);
  // Use the successful API records for calculations/rendering, with an empty array while unavailable. ApiBoundary distinguishes loading/error from a truly empty successful result.
  const rows = query.data ?? [];
  // Derive visible by retaining only rows that match the conditions below. filter creates a new array and leaves the original API records unchanged.
  const visible = rows.filter(
    (r) =>
      (tab === "All" || r.asset_type === tab) &&
      `${r.name} ${r.symbol ?? ""}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  // Prepare invested by transforming each source item. map returns a new array; the response records remain available in their original shape.
  const invested = total(rows.map((r) => r.invested_value));
  // Prepare value by transforming each source item. map returns a new array; the response records remain available in their original shape.
  const value = total(rows.map((r) => r.current_value));
  // Prepare gain by transforming each source item. map returns a new array; the response records remain available in their original shape.
  const gain = total(rows.map((r) => r.gain_loss));
  // Derive mix by retaining only rows that match the conditions below. filter creates a new array and leaves the original API records unchanged.
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
  // Describe each table cell with a stable key, label, optional sort selector, and render callback. DataTable handles repeated row markup.
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
              {/* Conditional JSX: render the following block only when the left-hand condition is truthy; otherwise React leaves it out. */}
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
            onClick={
              // Select the editor mode: null starts a new record, an existing row edits it, and undefined closes it. The write happens on form submit, not on this click.
              () => setEditor(r)
            }
          >
            <Icon name="edit" size={15} />
          </button>
          <button
            className="icon-button"
            aria-label={`Sell ${r.name}`}
            onClick={
              // Select a holding for redemption or clear it on close. The redemption form decides between quantity PATCH and complete DELETE after validation.
              () => setSell(r)
            }
          >
            <Icon name="north_east" size={15} />
          </button>
          <button
            className="icon-button"
            aria-label={`Delete ${r.name}`}
            onClick={
              // Remember the selected record for a confirmation dialog, or clear it on close. Selecting it alone does not send DELETE.
              () => setDeleting(r)
            }
          >
            <Icon name="delete" size={15} />
          </button>
        </div>
      ),
    },
  ];
  return (
    <div className="page-stack">
      {/* Page title and primary actions share the same layout classes; callbacks below change state or start an operation when clicked. */}
      <PageHeading
        title="Stocks & Mutual Funds"
        eyebrow="Equities · Active Folio"
        badge="API Connected"
        description="Investment snapshots, SIP schedules, and portfolio performance."
        actions={
          <>
            <Button icon="insights" onClick={
              // Open/close the explanation of analytics missing from the contract, rather than fabricating market history.
              () => setAnalytics(true)
            }>
              Analytics & Beta
            </Button>
            <Button
              variant="primary"
              icon="add_circle"
              onClick={
                // Select the editor mode: null starts a new record, an existing row edits it, and undefined closes it. The write happens on form submit, not on this click.
                () => setEditor(null)
              }
            >
              Add Investment
            </Button>
          </>
        }
      />
      {/* Request state belongs here: show initial loading or an error with Retry before treating the following content as successful data. */}
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
          {/* Historical Portfolio Growth section: the shared Card supplies the existing surface/spacing, while this screen supplies its contents. */}
          <Card
            title="Historical Portfolio Growth"
            subtitle="Market value progression versus cumulative invested capital"
          >
            <EmptyState text="Historical prices and benchmark data are not available from the API. Current valuations are shown below." />
          </Card>
          {/* Asset Allocation section: the shared Card supplies the existing surface/spacing, while this screen supplies its contents. */}
          <Card
            title="Asset Allocation"
            subtitle="Current reported stock and mutual fund values"
          >
            {/* Render numeric points derived from the API. Formatting and chart conversion affect presentation; the original decimal-string response stays unchanged. */}
            <AllocationChart
              data={mix}
              center={amount(value)}
              caption="Current Value"
            />
            {/* Turn matching items into JSX with map. Each repeated element needs a stable key so React preserves the right row/control when data changes. */}
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
        {/* Pass rows and display/interaction instructions to the shared table. Stable record IDs identify rows; server pagination must use the backend total, not items.length. */}
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
                    onChange={
                      // Search the already-loaded holdings by name/symbol. This module
                      // filters locally; typing here does not issue a new backend request.
                      (e) => setSearch(e.target.value)
                    }
                  />
                </label>
                <Button
                  icon="download"
                  onClick={
                    // Build a local download from the currently available API-derived rows. This exports a snapshot; it does not create or update financial records.
                    () =>
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
            {/* Turn matching items into JSX with map. Each repeated element needs a stable key so React preserves the right row/control when data changes. */}
            {amount(total(visible.map((r) => r.current_value)))}
          </strong>
        </div>
      </ApiBoundary>
      {/* Conditional JSX: render the following block only when the left-hand condition is truthy; otherwise React leaves it out. */}
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
          onClose={
            // Select the editor mode: null starts a new record, an existing row edits it, and undefined closes it. The write happens on form submit, not on this click.
            () => setEditor(undefined)
          }
        />
      )}
      {/* Keep destructive writes behind confirmation. The callback awaits DELETE; failures stay in the dialog and a successful 204 has no JSON body. */}
      <ConfirmDelete
        key={deleting?.id ?? "none"}
        open={Boolean(deleting)}
        onClose={
          // Remember the selected record for a confirmation dialog, or clear it on close. Selecting it alone does not send DELETE.
          () => setDeleting(undefined)
        }
        onConfirm={
          // This callback performs a backend write through mutate. Await success before closing/notifying; the shared cache then refreshes active reads, and failures propagate to the visible error handler.
          async () => {
            if (deleting)
              await mutate(`/api/investments/${deleting.id}`, "DELETE");
          }
        }
      />
      {/* Conditional JSX: render the following block only when the left-hand condition is truthy; otherwise React leaves it out. */}
      {sell && (
        <Modal
          open
          title="Sell / Redeem Investment"
          onClose={
            // Select a holding for redemption or clear it on close. The redemption form decides between quantity PATCH and complete DELETE after validation.
            () => setSell(undefined)
          }
        >
          <p className="muted text-xs mb-5">
            {sell.name} · {sell.quantity} units available. This updates the
            holding snapshot; no ledger transaction is created automatically.
          </p>
          {/* Field definitions below drive inputs and native required/min/max checks. onSave receives form strings and is awaited, so errors remain visible and repeated writes are blocked. */}
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
            onCancel={
              // Select a holding for redemption or clear it on close. The redemption form decides between quantity PATCH and complete DELETE after validation.
              () => setSell(undefined)
            }
            submit="Confirm Redemption"
            onSave={
              // This callback performs a backend write through mutate. Await success before closing/notifying; the shared cache then refreshes active reads, and failures propagate to the visible error handler.
              async (v) => {
                // Add API decimal strings for remaining with the exact total helper. Convert to Number only where a display/comparison/chart requires it.
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
              }
            }
          />
        </Modal>
      )}
      {/* The parent owns open/close state; Modal handles the native dialog and scroll cleanup. Content is only mounted while open. */}
      <Modal
        open={analytics}
        title="Portfolio Analytics & Beta"
        onClose={
          // Open/close the explanation of analytics missing from the contract, rather than fabricating market history.
          () => setAnalytics(false)
        }
      >
        <EmptyState text="Historical returns, sector classifications, and benchmark beta are not exposed by the current API." />
      </Modal>
    </div>
  );
}
