/*
 * src/components/pages/savings.tsx
 * Loads PPF accounts, the selected account contributions/interest, and savings goals. Contribution endpoints adjust the account on the backend; the frontend must not add the amount to the balance again.
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
  ContributionRead,
  PPFInterestRead,
  PPFRead,
  SavingsGoalRead,
} from "@/types/api";
// Reuse the shared read cache/write flow. useApi supplies reactive request state; successful mutate calls invalidate cached data so subscribed screens refresh.
import { mutate, useApi } from "@/lib/api-cache";
// Reuse decimal/date adapters. Money remains a string at the API boundary; exact totals and display/chart conversion have separate responsibilities.
import { decimal, percent, total } from "@/lib/api-format";
// Reuse formatting, local calculator, or download helpers. These utilities do not perform backend writes.
import { dateLabel, downloadCSV } from "@/lib/finance";
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
  Modal,
  PageHeading,
  Progress,
} from "../ui/primitives";
// Use a shared table plus typed column definitions; this file supplies rows/cell renderers while the table handles sorting and pagination controls.
import { DataTable, type Column } from "../ui/data-table";
// Resolve existing design icon names through the shared Lucide mapping, keeping icon rendering consistent.
import { Icon } from "../ui/icon";
// Render the Savings screen. Read API data first, derive display rows, then return JSX; props/state determine which controls and dialogs are visible.
export function Savings() {
  // Get the shared currency formatter; its settings read is deduplicated by the API cache.
  const amount = useAmount();
  // Destructure shared UI values and setters from FinanceProvider. Object braces select named properties; they do not create independent copies of the underlying state.
  const { month } = useFinance();
  // Subscribe accounts to this API key. The type inside <...> describes the returned data; loading/error/retry travel with it. A changed URL selects a new cached request, and null skips the read.
  const accounts = useApi<PPFRead[]>("all:/api/ppf");
  // Subscribe goals to this API key. The type inside <...> describes the returned data; loading/error/retry travel with it. A changed URL selects a new cached request, and null skips the read.
  const goals = useApi<SavingsGoalRead[]>("all:/api/savings-goals");
  // React state stores the selected backend record ID as a string, as supplied by HTML select controls. The setter (second array value) schedules a rerender when a control/event changes it; ordinary local variables would reset on each render.
  const [selected, setSelected] = useState("");
  // Selected PPF account for the shared editor: undefined is closed, null creates, and a record edits.
  const [accountEditor, setAccountEditor] = useState<
    PPFRead | null | undefined
  >();
  // Selected savings goal for the shared editor: undefined is closed, null creates, and a record edits.
  const [goalEditor, setGoalEditor] = useState<
    SavingsGoalRead | null | undefined
  >();
  // Selected contribution for the shared editor: undefined is closed, null creates, and a record edits.
  const [contributionEditor, setContributionEditor] = useState<
    ContributionRead | null | undefined
  >();
  // Remember the record chosen for deletion so the confirmation dialog can target it. Clearing the selection closes the dialog.
  const [deleting, setDeleting] = useState<{ path: string; name: string }>();
  // React state stores whether the contribution receipt preview is visible. The setter (second array value) schedules a rerender when a control/event changes it; ordinary local variables would reset on each render.
  const [receipt, setReceipt] = useState(false);
  // Track the financial-year start year; this PPF view treats April through the following March as one interval.
  const [fy, setFY] = useState(
    Number(month.slice(0, 4)) - (Number(month.slice(5)) < 4 ? 1 : 0),
  );
  // Resolve the selected string ID against numeric API IDs, falling back to the first account. Dependent contribution/interest hooks are disabled with null when no account exists.
  const account =
    accounts.data?.find((a) => String(a.id) === selected) ?? accounts.data?.[0];
  // Subscribe contributions to this API key. The type inside <...> describes the returned data; loading/error/retry travel with it. A changed URL selects a new cached request, and null skips the read.
  const contributions = useApi<ContributionRead[]>(
    account ? `/api/ppf/${account.id}/contributions` : null,
  );
  // Subscribe interest to this API key. The type inside <...> describes the returned data; loading/error/retry travel with it. A changed URL selects a new cached request, and null skips the read.
  const interest = useApi<PPFInterestRead>(
    account ? `/api/ppf/${account.id}/interest?financial_year=${fy}` : null,
  );
  // Derive fyRows by retaining only rows that match the conditions below. filter creates a new array and leaves the original API records unchanged.
  // Select only contributions within April 1 through March 31 for the chosen start year, so the annual cap/receipt do not include a different financial year.
  const fyRows = (contributions.data ?? []).filter(
    (c) =>
      c.contribution_date >= `${fy}-04-01` &&
      c.contribution_date <= `${fy + 1}-03-31`,
  );
  // Prepare deposited by transforming each source item. map returns a new array; the response records remain available in their original shape.
  const deposited = total(fyRows.map((c) => c.amount));
  // The PPF view compares contributions with the existing annual limit. This is display logic, not backend enforcement or a tax calculation.
  const cap = 150000;
  const room = cap - decimal(deposited);
  // Describe each table cell with a stable key, label, optional sort selector, and render callback. DataTable handles repeated row markup.
  const columns: Column<ContributionRead>[] = [
    {
      key: "date",
      title: "Contribution Date",
      sort: (r) => r.contribution_date,
      render: (r) => dateLabel(r.contribution_date),
    },
    {
      key: "ref",
      title: "Reference / UTR",
      render: (r) => r.reference_code ?? "—",
    },
    {
      key: "amount",
      title: "Deposit (₹)",
      sort: (r) => decimal(r.amount),
      render: (r) => <strong className="font-mono">{amount(r.amount)}</strong>,
    },
    {
      key: "actions",
      title: "Actions",
      render: (r) => (
        <div className="flex">
          <button
            className="icon-button"
            aria-label={`Edit contribution ${r.id}`}
            onClick={
              // Choose a contribution for create/edit. The contribution endpoint will update the account balance; this selection only opens/closes the form.
              () => setContributionEditor(r)
            }
          >
            <Icon name="edit" size={15} />
          </button>
          <button
            className="icon-button"
            aria-label={`Delete contribution ${r.id}`}
            onClick={
              // Remember the selected record for a confirmation dialog, or clear it on close. Selecting it alone does not send DELETE.
              () =>
                setDeleting({
                  path: `/api/ppf/${account?.id}/contributions/${r.id}`,
                  name: "contribution",
                })

            }
          >
            <Icon name="delete" size={15} />
          </button>
        </div>
      ),
    },
  ];
  // Prepare receiptRows by transforming each source item. map returns a new array; the response records remain available in their original shape.
  const receiptRows = [
    ["Date", "Amount INR", "Reference"],
    ...fyRows.map((r) => [
      r.contribution_date,
      r.amount,
      r.reference_code ?? "",
    ]),
  ];
  return (
    <div className="page-stack">
      {/* Page title and primary actions share the same layout classes; callbacks below change state or start an operation when clicked. */}
      <PageHeading
        title="PPF & Savings"
        eyebrow="Tax Sovereign Reserve"
        badge="API Connected"
        description="Reported PPF balances, contribution tracking, interest estimates, and savings goals"
        actions={
          <>
            <Button onClick={
              // Choose a PPF account for create/edit or close its dialog; opening the form itself does not modify the backend.
              () => setAccountEditor(null)
            } icon="add">
              Add Account
            </Button>
            <Button
              disabled={!account}
              onClick={
                // Open/close the selected financial-year contribution receipt, built from the existing contribution response.
                () => setReceipt(true)
              }
              icon="receipt_long"
            >
              Contribution Receipt
            </Button>
            <Button
              variant="primary"
              disabled={!account}
              icon="add_circle"
              onClick={
                // Choose a contribution for create/edit. The contribution endpoint will update the account balance; this selection only opens/closes the form.
                () => setContributionEditor(null)
              }
            >
              Log Contribution
            </Button>
          </>
        }
      />
      {/* Request state belongs here: show initial loading or an error with Retry before treating the following content as successful data. */}
      <ApiBoundary query={accounts}>
        {/* Turn matching items into JSX with map. Each repeated element needs a stable key so React preserves the right row/control when data changes. */}
        {account ? (
          <>
            <div className="filters">
              <label className="text-xs muted">
                PPF Account{" "}
                <select
                  aria-label="PPF account"
                  className="filter-select"
                  value={account.id}
                  onChange={
                    // Store the selected record ID from the HTML select (a string); the page matches it against numeric API IDs before requesting detail data.
                    (e) => setSelected(e.target.value)
                  }
                >
                  {/* Turn matching items into JSX with map. Each repeated element needs a stable key so React preserves the right row/control when data changes. */}
                  {accounts.data?.map((a) => (
                    <option value={a.id} key={a.id}>
                      {a.bank_name ?? "PPF"} · {a.account_reference ?? a.id}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs muted">
                Financial Year{" "}
                <select
                  aria-label="PPF financial year"
                  className="filter-select"
                  value={fy}
                  onChange={
                    // Choose the PPF financial-year start. The interest request and contribution-year filter update from that value.
                    (e) => setFY(Number(e.target.value))
                  }
                >
                  {/* Turn matching items into JSX with map. Each repeated element needs a stable key so React preserves the right row/control when data changes. */}
                  {Array.from({ length: 8 }, (_, i) => 2020 + i).map((y) => (
                    <option key={y} value={y}>
                      FY {y}–{y + 1}
                    </option>
                  ))}
                </select>
              </label>
              <Button icon="edit" onClick={
                // Choose a PPF account for create/edit or close its dialog; opening the form itself does not modify the backend.
                () => setAccountEditor(account)
              }>
                Edit Account
              </Button>
              <Button
                variant="danger"
                icon="delete"
                onClick={
                  // Remember the selected record for a confirmation dialog, or clear it on close. Selecting it alone does not send DELETE.
                  () =>
                    setDeleting({
                      path: `/api/ppf/${account.id}`,
                      name: "PPF account",
                    })

                }
              >
                Delete Account
              </Button>
            </div>
            <div className="metric-grid">
              <Metric
                label="Reported PPF Balance"
                value={amount(account.current_balance)}
                icon="account_balance"
                detail="Contributions already reflected by the API"
              />
              <Metric
                label={`FY ${fy} Contribution`}
                value={contributions.data ? amount(deposited) : "—"}
                icon="savings"
                detail={`${amount(room)} remaining under ₹1,50,000 cap`}
              />
              <Metric
                label="Recorded Interest Rate"
                value={
                  account.interest_rate == null
                    ? "—"
                    : `${account.interest_rate}% p.a.`
                }
                icon="percent"
                detail="Account rate, not a live government feed"
              />
              <Metric
                label="Statutory Maturity"
                value={dateLabel(account.maturity_date, { year: "numeric" })}
                icon="lock_clock"
                detail={dateLabel(account.maturity_date)}
              />
            </div>
            {/* Request state belongs here: show initial loading or an error with Retry before treating the following content as successful data. */}
            <ApiBoundary query={contributions}>
              {/* PPF Contribution Tracker & Sec 80C Cap Gauge section: the shared Card supplies the existing surface/spacing, while this screen supplies its contents. */}
              <Card
                title="PPF Contribution Tracker & Sec 80C Cap Gauge"
                subtitle="Contribution allowance for the selected financial year"
                action={
                  <Badge>
                    FY {fy}–{fy + 1}
                  </Badge>
                }
              >
                <div className="flex justify-between items-end mb-4">
                  <div>
                    <span className="muted text-xs">Utilized Allocation:</span>
                    <strong className="block font-mono text-2xl mt-2">
                      {amount(deposited)}{" "}
                      <span className="muted text-xs">of ₹1,50,000</span>
                    </strong>
                  </div>
                  <strong className="font-mono text-violet-700">
                    {((decimal(deposited) / 150000) * 100).toFixed(1)}%
                  </strong>
                </div>
                <Progress value={(decimal(deposited) / 150000) * 100} />
                <div className="flex justify-between text-xs mt-3">
                  <span className="positive">
                    Deposited to Date: {amount(deposited)}
                  </span>
                  <span className="muted">
                    Remaining Tax Exemption Room: {amount(room)}
                  </span>
                </div>
                <p className="info-strip mt-5">
                  The reported balance includes contributions. Interest below is
                  an estimate and has not been credited automatically.
                </p>
              </Card>
            </ApiBoundary>
          </>
        ) : (
          <Card>
            <EmptyState text="No PPF account recorded. Add an account before logging contributions." />
          </Card>
        )}
      </ApiBoundary>
      <div className="flex justify-between items-center">
        <div>
          <h2>Life Savings Goals</h2>
          <p className="muted text-xs">
            Saved amounts and remaining targets from the API
          </p>
        </div>
        <Button icon="add" onClick={
          // Choose a savings goal for create/edit or close its dialog; the common form submits the actual write.
          () => setGoalEditor(null)
        }>
          Create New Goal
        </Button>
      </div>
      {/* Request state belongs here: show initial loading or an error with Retry before treating the following content as successful data. */}
      <ApiBoundary query={goals}>
        <div className="goals-grid">
          {/* Turn matching items into JSX with map. Each repeated element needs a stable key so React preserves the right row/control when data changes. */}
          {goals.data?.map((goal) => (
            <Card className="goal-card" key={goal.id}>
              <div className="flex justify-between mb-5">
                <span className="entity-icon">
                  <Icon name="flag" />
                </span>
                <Badge tone="green">{percent(goal.progress_percent)}</Badge>
              </div>
              <h3>{goal.name}</h3>
              <p className="muted text-[10px] mt-2 mb-5">
                {/* Choose one of two UI branches with condition ? trueBranch : falseBranch. This keeps selected/empty/alternate states in the same layout position. */}
                {goal.target_date
                  ? dateLabel(goal.target_date)
                  : "No target date"}
              </p>
              <div className="summary-row">
                <span>Saved</span>
                <strong>{amount(goal.saved_amount)}</strong>
              </div>
              <div className="summary-row">
                <span>Target</span>
                <strong>{amount(goal.target_amount)}</strong>
              </div>
              <Progress value={decimal(goal.progress_percent)} tone="green" />
              <p className="muted text-[10px] mt-3">
                Remaining: {amount(goal.remaining_amount)}
              </p>
              <div className="flex justify-end mt-4 gap-2">
                <Button onClick={
                  // Choose a savings goal for create/edit or close its dialog; the common form submits the actual write.
                  () => setGoalEditor(goal)
                }>
                  Configure Goal
                </Button>
                <button
                  className="icon-button"
                  aria-label={`Delete ${goal.name}`}
                  onClick={
                    // Remember the selected record for a confirmation dialog, or clear it on close. Selecting it alone does not send DELETE.
                    () =>
                      setDeleting({
                        path: `/api/savings-goals/${goal.id}`,
                        name: goal.name,
                      })

                  }
                >
                  <Icon name="delete" size={15} />
                </button>
              </div>
            </Card>
          ))}
          <button
            className="new-record-card"
            onClick={
              // Choose a savings goal for create/edit or close its dialog; the common form submits the actual write.
              () => setGoalEditor(null)
            }
          >
            <Icon name="add" size={26} />
            <h3>Create New Goal</h3>
            <p>Plan a target and update its saved balance.</p>
          </button>
        </div>
      </ApiBoundary>
      {/* Turn matching items into JSX with map. Each repeated element needs a stable key so React preserves the right row/control when data changes. */}
      {account && (
        <>
          {/* Request state belongs here: show initial loading or an error with Retry before treating the following content as successful data. */}
          <ApiBoundary query={contributions}>
            {/* Pass rows and display/interaction instructions to the shared table. Stable record IDs identify rows; server pagination must use the backend total, not items.length. */}
            <DataTable
              rows={contributions.data ?? []}
              columns={columns}
              label="contributions"
              toolbar={
                <>
                  <div>
                    <h2>PPF Contribution Ledger</h2>
                    <p className="muted text-xs">
                      Deposits for the selected account
                    </p>
                  </div>
                  <div className="filters">
                    <Button
                      icon="download"
                      onClick={
                        // Build a local download from the currently available API-derived rows. This exports a snapshot; it does not create or update financial records.
                        () =>
                          downloadCSV("ppf-contributions.csv", receiptRows)

                      }
                    >
                      Export CSV
                    </Button>
                    <Button icon="print" onClick={() => window.print()}>
                      Print Statement
                    </Button>
                  </div>
                </>
              }
            />
          </ApiBoundary>
          {/* PPF Annual Interest Estimate section: the shared Card supplies the existing surface/spacing, while this screen supplies its contents. */}
          <Card
            title="PPF Annual Interest Estimate"
            subtitle={`FY ${fy}–${fy + 1} · Monthly eligible balances`}
          >
            {/* Request state belongs here: show initial loading or an error with Retry before treating the following content as successful data. */}
            <ApiBoundary query={interest}>
              {/* Turn matching items into JSX with map. Each repeated element needs a stable key so React preserves the right row/control when data changes. */}
              {interest.data && (
                <>
                  <p className="info-strip mb-5">{interest.data.basis}</p>
                  <div className="summary-row mb-4">
                    <span>
                      Estimated Annual Interest ({interest.data.interest_rate}%)
                    </span>
                    <strong className="positive">
                      {amount(interest.data.estimated_interest)}
                    </strong>
                  </div>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Month</th>
                          <th>Eligible Balance</th>
                          <th>Estimated Interest</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Turn matching items into JSX with map. Each repeated element needs a stable key so React preserves the right row/control when data changes. */}
                        {interest.data.months.map((row) => (
                          <tr key={row.month}>
                            <td>
                              {dateLabel(row.month, {
                                month: "long",
                                year: "numeric",
                              })}
                            </td>
                            <td className="font-mono">
                              {amount(row.eligible_balance)}
                            </td>
                            <td className="font-mono positive">
                              {amount(row.estimated_interest)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </ApiBoundary>
          </Card>
        </>
      )}
      {/* Conditional JSX: render the following block only when the left-hand condition is truthy; otherwise React leaves it out. */}
      {accountEditor !== undefined && (
        <ResourceEditor
          path="/api/ppf"
          record={accountEditor ?? undefined}
          title={accountEditor ? "Edit PPF Account" : "Add PPF Account"}
          defaults={{
            opening_date: `${month}-01`,
            maturity_date: `${Number(month.slice(0, 4)) + 15}-03-31`,
            opening_balance: "0",
            current_balance: "0",
            interest_rate: "7.1",
          }}
          onClose={
            // Choose a PPF account for create/edit or close its dialog; opening the form itself does not modify the backend.
            () => setAccountEditor(undefined)
          }
        />
      )}{" "}
      {/* Conditional JSX: render the following block only when the left-hand condition is truthy; otherwise React leaves it out. */}
      {goalEditor !== undefined && (
        <ResourceEditor
          path="/api/savings-goals"
          record={goalEditor ?? undefined}
          title={goalEditor ? "Configure Savings Goal" : "Create New Goal"}
          onClose={
            // Choose a savings goal for create/edit or close its dialog; the common form submits the actual write.
            () => setGoalEditor(undefined)
          }
        />
      )}{" "}
      {/* Conditional JSX: render the following block only when the left-hand condition is truthy; otherwise React leaves it out. */}
      {account && contributionEditor !== undefined && (
        <ResourceEditor
          path={`/api/ppf/${account.id}/contributions`}
          contractPath="/api/ppf/{record_id}/contributions"
          record={contributionEditor ?? undefined}
          title={
            contributionEditor
              ? "Edit PPF Contribution"
              : "Log PPF Contribution"
          }
          defaults={{ contribution_date: `${month}-22` }}
          onClose={
            // Choose a contribution for create/edit. The contribution endpoint will update the account balance; this selection only opens/closes the form.
            () => setContributionEditor(undefined)
          }
        />
      )}
      {/* Keep destructive writes behind confirmation. The callback awaits DELETE; failures stay in the dialog and a successful 204 has no JSON body. */}
      <ConfirmDelete
        key={deleting?.path ?? "none"}
        title={`Delete ${deleting?.name ?? "record"}?`}
        open={Boolean(deleting)}
        onClose={
          // Remember the selected record for a confirmation dialog, or clear it on close. Selecting it alone does not send DELETE.
          () => setDeleting(undefined)
        }
        onConfirm={
          // This callback performs a backend write through mutate. Await success before closing/notifying; the shared cache then refreshes active reads, and failures propagate to the visible error handler.
          async () => {
            if (deleting) await mutate(deleting.path, "DELETE");
          }
        }
      />
      {/* The parent owns open/close state; Modal handles the native dialog and scroll cleanup. Content is only mounted while open. */}
      <Modal
        open={receipt}
        title="PPF Contribution Receipt"
        onClose={
          // Open/close the selected financial-year contribution receipt, built from the existing contribution response.
          () => setReceipt(false)
        }
      >
        {/* Request state belongs here: show initial loading or an error with Retry before treating the following content as successful data. */}
        <ApiBoundary query={contributions}>
          {/* Turn matching items into JSX with map. Each repeated element needs a stable key so React preserves the right row/control when data changes. */}
          {fyRows.map((c) => (
            <div className="summary-row" key={c.id}>
              <span>
                {dateLabel(c.contribution_date)} · {c.reference_code ?? ""}
              </span>
              <strong>{amount(c.amount)}</strong>
            </div>
          ))}
          <Button
            icon="download"
            variant="primary"
            className="mt-5"
            onClick={
              // Build a local download from the currently available API-derived rows. This exports a snapshot; it does not create or update financial records.
              () =>
                downloadPDF(
                  "ppf-receipt.pdf",
                  `PPF Contributions FY ${fy}`,
                  receiptRows,
                )

            }
          >
            Download Receipt
          </Button>
        </ApiBoundary>
      </Modal>
    </div>
  );
}
