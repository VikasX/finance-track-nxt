/*
 * src/components/pages/loans.tsx
 * Loads loans and a selected loan amortization schedule. Stored EMI and backend formula estimates are distinct; browser EMI/prepayment tools model scenarios without saving them.
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
import type { AmortizationRead, LoanRead } from "@/types/api";
// Reuse the shared read cache/write flow. useApi supplies reactive request state; successful mutate calls invalidate cached data so subscribed screens refresh.
import { mutate, useApi } from "@/lib/api-cache";
// Reuse decimal/date adapters. Money remains a string at the API boundary; exact totals and display/chart conversion have separate responsibilities.
import { decimal, total } from "@/lib/api-format";
// Reuse formatting, local calculator, or download helpers. These utilities do not perform backend writes.
import {
  amortization,
  calculateEMI,
  dateLabel,
  downloadCSV,
} from "@/lib/finance";
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
  Progress,
  Tabs,
} from "../ui/primitives";
// Use paired slider/number controls for the local estimator; both inputs report one numeric value to parent state.
import { RangeField } from "../ui/range-field";
// Use a shared table plus typed column definitions; this file supplies rows/cell renderers while the table handles sorting and pagination controls.
import { DataTable, type Column } from "../ui/data-table";
// Use shared chart components/palette. This caller prepares the data; the chart only renders it.
import { AllocationChart } from "../charts";
// Resolve existing design icon names through the shared Lucide mapping, keeping icon rendering consistent.
import { Icon } from "../ui/icon";
// Render the Loans screen. Read API data first, derive display rows, then return JSX; props/state determine which controls and dialogs are visible.
export function Loans() {
  // Get the shared currency formatter; its settings read is deduplicated by the API cache.
  const amount = useAmount();
  // Destructure shared UI values and setters from FinanceProvider. Object braces select named properties; they do not create independent copies of the underlying state.
  const { month } = useFinance();
  // Subscribe query to this API key. The type inside <...> describes the returned data; loading/error/retry travel with it. A changed URL selects a new cached request, and null skips the read.
  const query = useApi<LoanRead[]>("all:/api/loans");
  // The editor selection uses three states: undefined closes it, null opens creation, and a record opens editing. This distinction lets one form support both POST and PATCH.
  const [editor, setEditor] = useState<LoanRead | null | undefined>();
  // Remember the record chosen for deletion so the confirmation dialog can target it. Clearing the selection closes the dialog.
  const [deleting, setDeleting] = useState<LoanRead>();
  // React state stores the calculator principal input; it does not edit a stored record. The setter (second array value) schedules a rerender when a control/event changes it; ordinary local variables would reset on each render.
  const [principal, setPrincipal] = useState(3000000);
  // React state stores the annual percentage used by the local calculator. The setter (second array value) schedules a rerender when a control/event changes it; ordinary local variables would reset on each render.
  const [rate, setRate] = useState(8.55);
  // React state stores the local loan estimate duration before unit conversion. The setter (second array value) schedules a rerender when a control/event changes it; ordinary local variables would reset on each render.
  const [tenure, setTenure] = useState(20);
  // React state stores whether loan tenure is entered in years or months. The setter (second array value) schedules a rerender when a control/event changes it; ordinary local variables would reset on each render.
  const [unit, setUnit] = useState("Years");
  // React state stores whether the prepayment scenario dialog is open. The setter (second array value) schedules a rerender when a control/event changes it; ordinary local variables would reset on each render.
  const [simulator, setSimulator] = useState(false);
  // React state stores the selected backend record ID as a string, as supplied by HTML select controls. The setter (second array value) schedules a rerender when a control/event changes it; ordinary local variables would reset on each render.
  const [selected, setSelected] = useState("");
  // React state stores the extra payment amount for the local prepayment scenario. The setter (second array value) schedules a rerender when a control/event changes it; ordinary local variables would reset on each render.
  const [extra, setExtra] = useState(5000);
  // React state stores whether extra repayment is monthly or a single lump sum. The setter (second array value) schedules a rerender when a control/event changes it; ordinary local variables would reset on each render.
  const [prepayMode, setPrepayMode] = useState("Monthly Top-up");
  // Use the successful API records for calculations/rendering, with an empty array while unavailable. ApiBoundary distinguishes loading/error from a truly empty successful result.
  const rows = query.data ?? [];
  const target = rows.find((r) => String(r.id) === selected) ?? rows[0];
  // Subscribe schedule to this API key. The type inside <...> describes the returned data; loading/error/retry travel with it. A changed URL selects a new cached request, and null skips the read.
  const schedule = useApi<AmortizationRead>(
    target ? `/api/loans/${target.id}/amortization` : null,
  );
  // Recalculate this browser-only estimate from the current calculator inputs; it does not persist or replace backend computed record fields.
  const estimate = calculateEMI(
    principal,
    rate,
    unit === "Years" ? tenure * 12 : tenure,
  );
  // Estimate payoff using the selected outstanding balance and stored EMI without extra payments; compare adjusted against this baseline, not against real payment history.
  const original = target
    ? amortization(
        decimal(target.outstanding_balance),
        decimal(target.interest_rate),
        decimal(target.monthly_emi),
      )
    : null;
  const adjusted = target
    ? amortization(
        decimal(target.outstanding_balance),
        decimal(target.interest_rate),
        decimal(target.monthly_emi),
        prepayMode === "Monthly Top-up" ? extra : 0,
        prepayMode === "One-time Lump Sum" ? extra : 0,
      )
    : null;
  // Adapt the backend schedule to table rows with an id; installment numbers are projection positions, not proof of payments made.
  const installments = (schedule.data?.schedule ?? []).map((r) => ({
    ...r,
    id: String(r.installment),
  }));
  // Describe each table cell with a stable key, label, optional sort selector, and render callback. DataTable handles repeated row markup.
  const columns: Column<(typeof installments)[number]>[] = [
    { key: "num", title: "Inst #", render: (r) => `#${r.installment}` },
    {
      key: "date",
      title: "Projected Due Date",
      sort: (r) => r.due_date,
      render: (r) => dateLabel(r.due_date),
    },
    {
      key: "principal",
      title: "Principal (₹)",
      render: (r) => <span className="font-mono">{amount(r.principal)}</span>,
    },
    {
      key: "interest",
      title: "Interest (₹)",
      render: (r) => (
        <span className="font-mono muted">{amount(r.interest)}</span>
      ),
    },
    {
      key: "payment",
      title: "Calculated Payment",
      render: (r) => <strong className="font-mono">{amount(r.payment)}</strong>,
    },
    {
      key: "balance",
      title: "Projected Balance",
      render: (r) => (
        <strong className="font-mono">{amount(r.closing_balance)}</strong>
      ),
    },
  ];
  return (
    <div className="page-stack">
      {/* Page title and primary actions share the same layout classes; callbacks below change state or start an operation when clicked. */}
      <PageHeading
        title="Loans & EMI"
        eyebrow="Personal Finance › Liabilities"
        description="Track liabilities, estimated amortization, prepayment scenarios, and scheduled payments"
        actions={
          <>
            <Button
              icon="insights"
              disabled={!rows.length}
              onClick={
                // Open/close the local prepayment scenario. Simulator inputs calculate estimates and do not save a strategy to the API.
                () => setSimulator(true)
              }
            >
              Prepayment Simulator
            </Button>
            <Button
              variant="primary"
              icon="add"
              onClick={
                // Select the editor mode: null starts a new record, an existing row edits it, and undefined closes it. The write happens on form submit, not on this click.
                () => setEditor(null)
              }
            >
              Add New Loan
            </Button>
          </>
        }
      />
      {/* Request state belongs here: show initial loading or an error with Retry before treating the following content as successful data. */}
      <ApiBoundary query={query}>
        <div className="metric-grid">
          <Metric
            label="Total Outstanding"
            value={amount(total(rows.map((r) => r.outstanding_balance)))}
            icon="account_balance"
            detail={`Across ${rows.length} facilities`}
          />
          <Metric
            label="Stored Monthly EMI"
            value={amount(total(rows.map((r) => r.monthly_emi)))}
            icon="credit_card"
            detail="Recorded repayment amounts"
          />
          <Metric
            label="Active Liabilities"
            value={`${rows.filter((r) => r.status === "active").length} Accounts`}
            icon="receipt_long"
            detail={`${rows.length} total loan records`}
          />
          <Metric
            label="Estimated Total Interest"
            value={amount(total(rows.map((r) => r.estimated_total_interest)))}
            icon="percent"
            detail="Original-loan formula estimates"
          />
        </div>
        <div className="flex justify-between items-center">
          <h2>Active Accounts</h2>
          <Badge tone="gray">Reported loan snapshots</Badge>
        </div>
        <div className="grid-halves">
          {/* Turn matching items into JSX with map. Each repeated element needs a stable key so React preserves the right row/control when data changes. */}
          {rows.map((r) => (
            <Card key={r.id}>
              <div className="flex gap-3 items-start">
                <span className="entity-icon">
                  <Icon
                    name={
                      r.loan_type.toLowerCase().includes("home")
                        ? "home_work"
                        : "directions_car"
                    }
                  />
                </span>
                <div>
                  <h3>{r.loan_name}</h3>
                  <p className="muted text-xs">
                    {r.loan_type} · {r.account_reference ?? `Loan #${r.id}`}
                  </p>
                </div>
                <strong className="ml-auto font-mono text-violet-700">
                  {r.interest_rate}% p.a.
                </strong>
              </div>
              <div className="grid grid-cols-3 gap-3 my-6">
                <div>
                  <span className="muted text-[10px]">Outstanding</span>
                  <strong className="block font-mono text-xs">
                    {amount(r.outstanding_balance)}
                  </strong>
                </div>
                <div>
                  <span className="muted text-[10px]">Stored EMI</span>
                  <strong className="block font-mono text-xs">
                    {amount(r.monthly_emi)}
                  </strong>
                </div>
                <div>
                  <span className="muted text-[10px]">Next Due</span>
                  <strong className="block text-xs">
                    {/* Choose one of two UI branches with condition ? trueBranch : falseBranch. This keeps selected/empty/alternate states in the same layout position. */}
                    {r.next_due_date ? dateLabel(r.next_due_date) : "—"}
                  </strong>
                </div>
              </div>
              <Progress
                value={
                  decimal(r.principal)
                    ? (1 -
                        decimal(r.outstanding_balance) / decimal(r.principal)) *
                      100
                    : 0
                }
              />
              <p className="muted text-[10px] mt-3">
                Original principal: {amount(r.principal)} · Formula EMI:{" "}
                {amount(r.calculated_emi)} · Tenure: {r.tenure_months} months
              </p>
              <div className="split-line" />
              <div className="flex justify-end gap-2">
                <Button
                  onClick={
                    // Store the selected record ID from the HTML select (a string); the page matches it against numeric API IDs before requesting detail data.
                    () => {
                      setSelected(String(r.id));
                      setSimulator(true);
                    }
                  }
                >
                  Prepay Principal
                </Button>
                <Button icon="edit" onClick={
                  // Select the editor mode: null starts a new record, an existing row edits it, and undefined closes it. The write happens on form submit, not on this click.
                  () => setEditor(r)
                }>
                  Edit
                </Button>
                <button
                  className="icon-button"
                  aria-label={`Delete ${r.loan_name}`}
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
        {!rows.length && (
          <Card>
            <EmptyState text="No loans recorded." />
          </Card>
        )}
      </ApiBoundary>
      <div className="grid-main">
        {/* EMI & Amortization Calculator section: the shared Card supplies the existing surface/spacing, while this screen supplies its contents. */}
        <Card
          title="EMI & Amortization Calculator"
          subtitle="Model new loans or simulate rate changes"
          action={
            <Tabs
              value={unit}
              onChange={(v) => {
                setUnit(v);
                setTenure(v === "Years" ? 20 : 240);
              }}
              items={["Years", "Months"]}
            />
          }
        >
          <div className="grid-halves">
            <div>
              <RangeField
                label="Loan Amount (₹)"
                value={principal}
                onChange={setPrincipal}
                min={100000}
                max={15000000}
                step={10000}
                ticks={["₹1L", "₹75L", "₹1.5Cr"]}
              />
              <RangeField
                label="Interest Rate (p.a.)"
                value={rate}
                onChange={setRate}
                min={0}
                max={30}
                step={0.05}
                ticks={["0%", "15%", "30%"]}
              />
              <RangeField
                label={`Tenure (${unit})`}
                value={tenure}
                onChange={setTenure}
                min={1}
                max={unit === "Years" ? 30 : 360}
                ticks={
                  unit === "Years"
                    ? ["1 Year", "15 Years", "30 Years"]
                    : ["1 Mo", "180 Mo", "360 Mo"]
                }
              />
            </div>
            <div className="bg-slate-50 rounded-xl p-5">
              <span className="metric-label">Calculated Monthly EMI</span>
              <strong
                className="block font-mono text-3xl text-violet-700 mt-3"
                data-testid="loan-emi"
              >
                {amount(estimate.emi)}
              </strong>
              {/* Render numeric points derived from the API. Formatting and chart conversion affect presentation; the original decimal-string response stays unchanged. */}
              <AllocationChart
                data={[
                  { name: "Principal", value: principal },
                  { name: "Interest", value: estimate.interest },
                ]}
                center={`${((principal / Math.max(estimate.total, 1)) * 100).toFixed(0)}%`}
                caption="Principal"
                height={180}
              />
              <div className="summary-row">
                <span>Total Interest</span>
                <strong>{amount(estimate.interest)}</strong>
              </div>
              <div className="summary-row">
                <span>Total Cost</span>
                <strong>{amount(estimate.total)}</strong>
              </div>
            </div>
          </div>
        </Card>
        {/* Smart Prepayment Strategy section: the shared Card supplies the existing surface/spacing, while this screen supplies its contents. */}
        <Card className="strategy-card" title="Smart Prepayment Strategy">
          <Badge>Local Scenario Calculator</Badge>
          <h3 className="mt-5">Explore Extra Principal Payments</h3>
          <p className="muted text-xs leading-6 mt-3">
            Compare the current stored EMI with a monthly top-up or a one-time
            lump sum. Scenarios are estimates and do not alter the loan or post
            payments.
          </p>
          <Button
            variant="primary"
            className="w-full mt-6"
            disabled={!rows.length}
            onClick={
              // Open/close the local prepayment scenario. Simulator inputs calculate estimates and do not save a strategy to the API.
              () => setSimulator(true)
            }
          >
            Configure
          </Button>
        </Card>
      </div>
      {/* Amortization & Payment Projection section: the shared Card supplies the existing surface/spacing, while this screen supplies its contents. */}
      <Card
        title="Amortization & Payment Projection"
        subtitle="Original-loan projection, not a paid-installment ledger"
        action={
          <select
            className="filter-select"
            aria-label="Amortization account"
            value={target?.id ?? ""}
            onChange={
              // Store the selected record ID from the HTML select (a string); the page matches it against numeric API IDs before requesting detail data.
              (e) => setSelected(e.target.value)
            }
          >
            {/* Turn matching items into JSX with map. Each repeated element needs a stable key so React preserves the right row/control when data changes. */}
            {rows.map((r) => (
              <option value={r.id} key={r.id}>
                {r.loan_name}
              </option>
            ))}
          </select>
        }
      >
        {/* Turn matching items into JSX with map. Each repeated element needs a stable key so React preserves the right row/control when data changes. */}
        {target ? (
          <ApiBoundary query={schedule}>
            {/* Turn matching items into JSX with map. Each repeated element needs a stable key so React preserves the right row/control when data changes. */}
            {schedule.data && (
              <>
                <p className="info-strip mb-4">{schedule.data.basis}</p>
                <div className="flex justify-between text-xs muted mb-4">
                  <span>
                    Stored EMI: {amount(schedule.data.reported_monthly_emi)} ·
                    Calculated EMI: {amount(schedule.data.calculated_emi)}
                  </span>
                  <Button
                    icon="download"
                    onClick={
                      // Build a local download from the currently available API-derived rows. This exports a snapshot; it does not create or update financial records.
                      () =>
                        downloadCSV("fintrack-amortization.csv", [
                          [
                            "Installment",
                            "Due Date",
                            "Principal",
                            "Interest",
                            "Payment",
                            "Balance",
                          ],
                          ...installments.map((r) => [
                            r.installment,
                            r.due_date,
                            r.principal,
                            r.interest,
                            r.payment,
                            r.closing_balance,
                          ]),
                        ])

                    }
                  >
                    Export Statement
                  </Button>
                </div>
                {/* Pass rows and display/interaction instructions to the shared table. Stable record IDs identify rows; server pagination must use the backend total, not items.length. */}
                <DataTable
                  rows={installments}
                  columns={columns}
                  label="projected installments"
                />
              </>
            )}
          </ApiBoundary>
        ) : (
          <EmptyState text="Add a loan to view its projection." />
        )}
      </Card>
      {/* Conditional JSX: render the following block only when the left-hand condition is truthy; otherwise React leaves it out. */}
      {editor !== undefined && (
        <ResourceEditor
          path="/api/loans"
          record={editor ?? undefined}
          title={editor ? "Edit Loan" : "Add New Loan"}
          defaults={{ start_date: `${month}-01`, status: "active" }}
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
            if (deleting) await mutate(`/api/loans/${deleting.id}`, "DELETE");
          }
        }
      />
      {/* The parent owns open/close state; Modal handles the native dialog and scroll cleanup. Content is only mounted while open. */}
      <Modal
        open={simulator}
        title="Prepayment Impact Simulator"
        subtitle="Estimated impact on the reported outstanding balance"
        onClose={
          // Open/close the local prepayment scenario. Simulator inputs calculate estimates and do not save a strategy to the API.
          () => setSimulator(false)
        }
      >
        <label className="field mb-5">
          Select Target Account
          <select
            value={target?.id ?? ""}
            onChange={
              // Store the selected record ID from the HTML select (a string); the page matches it against numeric API IDs before requesting detail data.
              (e) => setSelected(e.target.value)
            }
          >
            {/* Turn matching items into JSX with map. Each repeated element needs a stable key so React preserves the right row/control when data changes. */}
            {rows.map((r) => (
              <option value={r.id} key={r.id}>
                {r.loan_name} · {amount(r.outstanding_balance)}
              </option>
            ))}
          </select>
        </label>
        <Tabs
          value={prepayMode}
          onChange={setPrepayMode}
          items={["Monthly Top-up", "One-time Lump Sum"]}
        />
        <div className="mt-5">
          <RangeField
            label="Prepayment Amount (₹)"
            value={extra}
            onChange={setExtra}
            min={0}
            max={
              prepayMode === "Monthly Top-up"
                ? 100000
                : Math.max(decimal(target?.outstanding_balance), 1)
            }
            step={1000}
            ticks={["₹0", "Extra principal payment"]}
          />
        </div>
        {/* Choose one of two UI branches with condition ? trueBranch : falseBranch. This keeps selected/empty/alternate states in the same layout position. */}
        {original &&
        adjusted &&
        Number.isFinite(original.interest) &&
        Number.isFinite(adjusted.interest) ? (
          <div className="grid-halves">
            <div className="info-strip green !block">
              <span>Estimated Interest Saved</span>
              <strong
                className="block font-mono text-xl mt-2"
                data-testid="interest-saved"
              >
                {amount(original.interest - adjusted.interest)}
              </strong>
            </div>
            <div className="info-strip purple !block">
              <span>Tenure Reduced By</span>
              <strong className="block font-mono text-xl mt-2">
                {original.months - adjusted.months} Months
              </strong>
            </div>
          </div>
        ) : (
          <p role="alert" className="api-error">
            The stored EMI does not cover monthly interest, so this scenario
            cannot amortize.
          </p>
        )}
        <p className="muted text-xs mt-5">
          Saving prepayment strategies is not supported by the current API.
        </p>
        <div className="modal-footer">
          <Button onClick={
            // Open/close the local prepayment scenario. Simulator inputs calculate estimates and do not save a strategy to the API.
            () => setSimulator(false)
          }>Close</Button>
        </div>
      </Modal>
    </div>
  );
}
