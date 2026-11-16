/*
 * src/components/pages/deposits.tsx
 * Loads fixed deposits and backend-supplied valuation estimates. The separate calculator uses local slider inputs; changing its estimate never edits a stored deposit.
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
import type { FixedDepositRead } from "@/types/api";
// Reuse the shared read cache/write flow. useApi supplies reactive request state; successful mutate calls invalidate cached data so subscribed screens refresh.
import { mutate, useApi } from "@/lib/api-cache";
// Reuse decimal/date adapters. Money remains a string at the API boundary; exact totals and display/chart conversion have separate responsibilities.
import { decimal, total } from "@/lib/api-format";
// Reuse formatting, local calculator, or download helpers. These utilities do not perform backend writes.
import { calculateFD, dateLabel } from "@/lib/finance";
// Reuse document export helpers that turn current API-derived rows into local downloads.
import { downloadPDF } from "@/lib/export";
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
  PageHeading,
  Tabs,
} from "../ui/primitives";
// Use paired slider/number controls for the local estimator; both inputs report one numeric value to parent state.
import { RangeField } from "../ui/range-field";
// Resolve existing design icon names through the shared Lucide mapping, keeping icon rendering consistent.
import { Icon } from "../ui/icon";
// Render the Deposits screen. Read API data first, derive display rows, then return JSX; props/state determine which controls and dialogs are visible.
export function Deposits() {
  // Get the shared currency formatter; its settings read is deduplicated by the API cache.
  const amount = useAmount();
  // Destructure shared UI values and setters from FinanceProvider. Object braces select named properties; they do not create independent copies of the underlying state.
  const { month } = useFinance();
  // Subscribe query to this API key. The type inside <...> describes the returned data; loading/error/retry travel with it. A changed URL selects a new cached request, and null skips the read.
  const query = useApi<FixedDepositRead[]>("all:/api/fixed-deposits");
  // React state stores the active local list/calendar filter. The setter (second array value) schedules a rerender when a control/event changes it; ordinary local variables would reset on each render.
  const [filter, setFilter] = useState("All");
  // The editor selection uses three states: undefined closes it, null opens creation, and a record opens editing. This distinction lets one form support both POST and PATCH.
  const [editor, setEditor] = useState<FixedDepositRead | null | undefined>();
  // Remember the record chosen for deletion so the confirmation dialog can target it. Clearing the selection closes the dialog.
  const [deleting, setDeleting] = useState<FixedDepositRead>();
  // React state stores the calculator principal input; it does not edit a stored record. The setter (second array value) schedules a rerender when a control/event changes it; ordinary local variables would reset on each render.
  const [principal, setPrincipal] = useState(100000);
  // React state stores the annual percentage used by the local calculator. The setter (second array value) schedules a rerender when a control/event changes it; ordinary local variables would reset on each render.
  const [rate, setRate] = useState(7.25);
  // React state stores the local FD estimate duration in years. The setter (second array value) schedules a rerender when a control/event changes it; ordinary local variables would reset on each render.
  const [years, setYears] = useState(3);
  // React state stores the local FD compounding selection. The setter (second array value) schedules a rerender when a control/event changes it; ordinary local variables would reset on each render.
  const [frequency, setFrequency] = useState("Quarterly");
  // Use the successful API records for calculations/rendering, with an empty array while unavailable. ApiBoundary distinguishes loading/error from a truly empty successful result.
  const rows = query.data ?? [];
  // Derive visible by retaining only rows that match the conditions below. filter creates a new array and leaves the original API records unchanged.
  const visible = rows.filter(
    (r) =>
      filter === "All" ||
      (r.maturity_date >= `${month}-01` &&
        r.maturity_date <=
          `${Number(month.slice(0, 4)) + 1}-${month.slice(5)}-01`),
  );
  // Translate the selected compounding frequency into compounds per year for the local FD formula.
  const n = frequency === "Monthly" ? 12 : frequency === "Quarterly" ? 4 : 1;
  // Recalculate this browser-only estimate from the current calculator inputs; it does not persist or replace backend computed record fields.
  const estimate = calculateFD(principal, rate, years, n);
  // Weight each interest rate by its deposit principal so a small deposit does not count as much as a large one in the portfolio average.
  const weighted =
    rows.reduce(
      (n, r) => n + decimal(r.principal) * decimal(r.interest_rate),
      0,
    ) / Math.max(decimal(total(rows.map((r) => r.principal))), 1);
  return (
    <div className="page-stack">
      <Card>
        {/* Page title and primary actions share the same layout classes; callbacks below change state or start an operation when clicked. */}
        <PageHeading
          title="Fixed Deposits"
          description="Deposit snapshots, estimated returns, and maturity milestones."
          actions={
            <>
              <Button
                icon="download"
                disabled={!query.data}
                onClick={
                  // Build a local download from the currently available API-derived rows. This exports a snapshot; it does not create or update financial records.
                  () =>
                    downloadPDF(
                      "fintrack-fd-summary.pdf",
                      "Fixed Deposit Estimate Summary",
                      [
                        [
                          "Bank",
                          "Principal",
                          "Rate",
                          "Estimated Maturity",
                          "Date",
                        ],
                        ...rows.map((r) => [
                          r.bank_name,
                          r.principal,
                          r.interest_rate,
                          r.estimated_maturity_value,
                          r.maturity_date,
                        ]),
                      ],
                    )

                }
              >
                Download Interest Summary
              </Button>
              <Button
                variant="primary"
                icon="add_circle"
                onClick={
                  // Select the editor mode: null starts a new record, an existing row edits it, and undefined closes it. The write happens on form submit, not on this click.
                  () => setEditor(null)
                }
              >
                Open New FD
              </Button>
            </>
          }
        />
      </Card>
      {/* Request state belongs here: show initial loading or an error with Retry before treating the following content as successful data. */}
      <ApiBoundary query={query}>
        <div className="metric-grid">
          <Metric
            label="Total FD Principal"
            value={amount(total(rows.map((r) => r.principal)))}
            icon="account_balance_wallet"
            detail="Recorded deposits"
          />
          <Metric
            label="Estimated Interest"
            value={amount(total(rows.map((r) => r.estimated_interest)))}
            icon="savings"
            tone="positive"
            detail="Estimated full-term interest"
          />
          <Metric
            label="Weighted Avg. Return"
            value={`${weighted.toFixed(2)}%`}
            icon="percent"
            detail="Weighted by principal"
          />
          <Metric
            label="Active Deposits"
            value={`${rows.filter((r) => r.status === "active").length} FDs`}
            icon="account_balance"
            detail={`${rows.length} total records`}
          />
        </div>
        <div className="flex justify-between items-center flex-wrap gap-3">
          <div>
            <h2>Your Fixed Deposit Portfolio</h2>
            <p className="muted text-xs">
              Computed values are estimates supplied by the API
            </p>
          </div>
          <Tabs
            value={filter}
            onChange={
              // Change the selected visible group. This screen derives its filtered rows/events from the chosen value on the next render.
              setFilter
            }
            items={["All", "Maturing Within 1 Year"]}
          />
        </div>
        <div className="deposit-grid">
          {/* Turn matching items into JSX with map. Each repeated element needs a stable key so React preserves the right row/control when data changes. */}
          {visible.map((r) => (
            <Card key={r.id} className="!p-4">
              <div className="flex gap-3 items-start">
                <span className="entity-icon">
                  {r.bank_name.slice(0, 2).toUpperCase()}
                </span>
                <div>
                  <h3 className="!text-sm">{r.bank_name}</h3>
                  <small className="muted text-[10px]">
                    {r.fd_reference ?? `FD #${r.id}`}
                  </small>
                </div>
                <Badge tone="purple">{r.status ?? "Status unavailable"}</Badge>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 mt-5">
                <div className="summary-row">
                  <span>Principal</span>
                  <strong>{amount(r.principal)}</strong>
                </div>
                <div className="summary-row">
                  <span>Interest Rate</span>
                  <strong className="positive">{r.interest_rate}% p.a.</strong>
                </div>
                <div className="summary-row">
                  <span>Estimated Current Value</span>
                  <strong>{amount(r.estimated_current_value)}</strong>
                </div>
                <div className="summary-row">
                  <span>Estimated Maturity</span>
                  <strong className="text-violet-700">
                    {amount(r.estimated_maturity_value)}
                  </strong>
                </div>
              </div>
              <p className="muted text-[10px] mt-4">
                Maturity: {dateLabel(r.maturity_date)}
              </p>
              <p className="muted text-[10px] mt-2">{r.calculation_basis}</p>
              <div className="flex justify-end gap-2 mt-4">
                <Button onClick={
                  // Select the editor mode: null starts a new record, an existing row edits it, and undefined closes it. The write happens on form submit, not on this click.
                  () => setEditor(r)
                }>Details / Edit</Button>
                <button
                  className="icon-button"
                  aria-label={`Delete deposit ${r.id}`}
                  onClick={
                    // Remember the selected record for a confirmation dialog, or clear it on close. Selecting it alone does not send DELETE.
                    () => setDeleting(r)
                  }
                >
                  <Icon name="delete" size={15} />
                </button>
              </div>
            </Card>
          ))}
        </div>
        {/* Conditional JSX: render the following block only when the left-hand condition is truthy; otherwise React leaves it out. */}
        {!visible.length && (
          <Card>
            <EmptyState text="No deposits match this selection." />
          </Card>
        )}
      </ApiBoundary>
      <div className="grid-halves">
        {/* Interactive FD Maturity Calculator section: the shared Card supplies the existing surface/spacing, while this screen supplies its contents. */}
        <Card
          title="Interactive FD Maturity Calculator"
          subtitle="Estimate yield with flexible compounding frequencies"
          action={
            <Button
              variant="ghost"
              onClick={() => {
                setPrincipal(100000);
                setRate(7.25);
                setYears(3);
                setFrequency("Quarterly");
              }}
            >
              Reset
            </Button>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5">
            <RangeField
              label="Deposit Amount (₹)"
              value={principal}
              onChange={setPrincipal}
              min={5000}
              max={2000000}
              step={1000}
              ticks={["₹5,000", "₹10,00,000", "₹20,00,000"]}
            />
            <RangeField
              label="Interest Rate (% p.a.)"
              value={rate}
              onChange={setRate}
              min={0}
              max={20}
              step={0.05}
              ticks={["0%", "10%", "20%"]}
            />
            <RangeField
              label="Tenure (Years)"
              value={years}
              onChange={setYears}
              min={1}
              max={10}
              ticks={["1 Yr", "5 Yrs", "10 Yrs"]}
            />
            <div>
              <span className="field-label">Compounding Frequency</span>
              <Tabs
                value={frequency}
                onChange={setFrequency}
                items={["Quarterly", "Monthly", "Annually"]}
              />
            </div>
          </div>
          <div className="calculator-result">
            <div>
              <div className="summary-row">
                <span>Principal Invested</span>
                <strong>{amount(principal)}</strong>
              </div>
              <div className="summary-row">
                <span>Total Estimated Interest</span>
                <strong className="positive">
                  {amount(estimate.interest)}
                </strong>
              </div>
            </div>
            <div className="calculator-total">
              <span className="metric-label">Estimated Maturity</span>
              <strong data-testid="fd-maturity">
                {amount(estimate.maturity)}
              </strong>
            </div>
          </div>
          <div className="flex justify-between items-center mt-5">
            <p className="muted text-[10px]">
              Assumes a constant rate without withdrawal penalties.
            </p>
            <Button variant="ghost" onClick={
              // Select the editor mode: null starts a new record, an existing row edits it, and undefined closes it. The write happens on form submit, not on this click.
              () => setEditor(null)
            }>
              Record at this rate →
            </Button>
          </div>
        </Card>
        {/* Maturity Milestones section: the shared Card supplies the existing surface/spacing, while this screen supplies its contents. */}
        <Card
          title="Maturity Milestones"
          subtitle="Scheduled estimated payouts"
        >
          {/* Request state belongs here: show initial loading or an error with Retry before treating the following content as successful data. */}
          <ApiBoundary query={query}>
            {/* Turn matching items into JSX with map. Each repeated element needs a stable key so React preserves the right row/control when data changes. */}
            {rows.length ? (
              rows
                .slice()
                .sort((a, b) => a.maturity_date.localeCompare(b.maturity_date))
                .map((r, i) => (
                  <div className="flex gap-3 mb-5" key={r.id}>
                    <span className="milestone-number">{i + 1}</span>
                    <div className="flex-1 bg-slate-50 p-3 rounded-lg">
                      <div className="summary-row">
                        <strong>{r.bank_name}</strong>
                        <strong>{amount(r.estimated_maturity_value)}</strong>
                      </div>
                      <p className="muted text-xs">
                        {dateLabel(r.maturity_date)}
                      </p>
                      <p className="muted text-[10px] mt-3">
                        {r.compounding_frequency ?? "Frequency not recorded"}{" "}
                        compounding
                      </p>
                    </div>
                  </div>
                ))
            ) : (
              <EmptyState text="No maturity milestones." />
            )}
          </ApiBoundary>
        </Card>
      </div>
      {/* Comparative Bank Fixed Deposit Rates section: the shared Card supplies the existing surface/spacing, while this screen supplies its contents. */}
      <Card title="Comparative Bank Fixed Deposit Rates">
        <EmptyState text="Bank rate comparisons and maturity instructions are not exposed by the current API." />
      </Card>
      {/* Conditional JSX: render the following block only when the left-hand condition is truthy; otherwise React leaves it out. */}
      {editor !== undefined && (
        <ResourceEditor
          path="/api/fixed-deposits"
          record={editor ?? undefined}
          title={
            editor ? "Manage Fixed Deposit" : "Record / Open Fixed Deposit"
          }
          defaults={{
            principal: String(principal),
            interest_rate: String(rate),
            start_date: `${month}-22`,
            maturity_date: `${Number(month.slice(0, 4)) + years}-${month.slice(5)}-22`,
            compounding_frequency: frequency.toLowerCase(),
            status: "active",
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
              await mutate(`/api/fixed-deposits/${deleting.id}`, "DELETE");
          }
        }
      />
    </div>
  );
}
