/*
 * src/components/pages/budgets.tsx
 * Loads month-specific budget envelopes and category names. Spending/remaining/usage come from FastAPI; create/edit/delete use the shared ResourceEditor and cache invalidation.
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
import type { BudgetRead, CategoryRead } from "@/types/api";
// Reuse the shared read cache/write flow. useApi supplies reactive request state; successful mutate calls invalidate cached data so subscribed screens refresh.
import { mutate, useApi } from "@/lib/api-cache";
// Reuse decimal/date adapters. Money remains a string at the API boundary; exact totals and display/chart conversion have separate responsibilities.
import { decimal, percent, total } from "@/lib/api-format";
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
  Progress,
  Tabs,
} from "../ui/primitives";
// Resolve existing design icon names through the shared Lucide mapping, keeping icon rendering consistent.
import { Icon } from "../ui/icon";
// Render the Budgets screen. Read API data first, derive display rows, then return JSX; props/state determine which controls and dialogs are visible.
export function Budgets() {
  // Get the shared currency formatter; its settings read is deduplicated by the API cache.
  const amount = useAmount();
  // Destructure shared UI values and setters from FinanceProvider. Object braces select named properties; they do not create independent copies of the underlying state.
  const { month } = useFinance();
  // Subscribe query to this API key. The type inside <...> describes the returned data; loading/error/retry travel with it. A changed URL selects a new cached request, and null skips the read.
  const query = useApi<BudgetRead[]>(`all:/api/budgets?month=${month}-01`);
  // Subscribe categories to this API key. The type inside <...> describes the returned data; loading/error/retry travel with it. A changed URL selects a new cached request, and null skips the read.
  const categories = useApi<CategoryRead[]>("all:/api/categories");
  // React state stores the active local list/calendar filter. The setter (second array value) schedules a rerender when a control/event changes it; ordinary local variables would reset on each render.
  const [filter, setFilter] = useState("All");
  // The editor selection uses three states: undefined closes it, null opens creation, and a record opens editing. This distinction lets one form support both POST and PATCH.
  const [editor, setEditor] = useState<BudgetRead | null | undefined>();
  // Remember the record chosen for deletion so the confirmation dialog can target it. Clearing the selection closes the dialog.
  const [deleting, setDeleting] = useState<BudgetRead>();
  // Use the successful API records for calculations/rendering, with an empty array while unavailable. ApiBoundary distinguishes loading/error from a truly empty successful result.
  const rows = query.data ?? [];
  // Derive alerts by retaining only rows that match the conditions below. filter creates a new array and leaves the original API records unchanged.
  const alerts = rows.filter((b) => decimal(b.usage_percent) >= 90);
  const name = (b: BudgetRead) =>
    categories.data?.find((c) => c.id === b.category_id)?.name ??
    `Category ${b.category_id}`;
  return (
    <div className="page-stack">
      {/* Page title and primary actions share the same layout classes; callbacks below change state or start an operation when clicked. */}
      <PageHeading
        title="Monthly Budgets"
        eyebrow="Financial Planning"
        badge="API Connected"
        description="Plan category thresholds, monitor pacing, and prevent expense overflows"
        actions={
          <Button
            variant="primary"
            icon="add_circle"
            onClick={
              // Select the editor mode: null starts a new record, an existing row edits it, and undefined closes it. The write happens on form submit, not on this click.
              () => setEditor(null)
            }
          >
            Create New Budget
          </Button>
        }
      />
      {/* Request state belongs here: show initial loading or an error with Retry before treating the following content as successful data. */}
      <ApiBoundary query={query}>
        <div className="metric-grid transactions-metrics">
          <Metric
            label="Total Monthly Budget"
            value={amount(total(rows.map((b) => b.limit_amount)))}
            icon="account_balance_wallet"
            detail={`Across ${rows.length} envelopes`}
          />
          <Metric
            label="Total Spent"
            value={amount(total(rows.map((b) => b.spent_amount)))}
            icon="credit_card"
            detail="Actual category expenses for selected month"
          />
          <Metric
            label="Remaining to Spend"
            value={amount(total(rows.map((b) => b.remaining_amount)))}
            icon="savings"
            tone="positive"
            detail="Budget limits less recorded spending"
          />
        </div>
        <div className="flex justify-between items-center gap-3">
          <div>
            <h2>Category Allocations</h2>
            <p className="muted text-xs">
              Spending and utilization calculated by the API
            </p>
          </div>
          <Tabs
            value={filter}
            onChange={
              // Change the selected visible group. This screen derives its filtered rows/events from the chosen value on the next render.
              setFilter
            }
            items={[
              { value: "All", label: `All (${rows.length})` },
              { value: "Alerts", label: `Alerts (${alerts.length})` },
            ]}
          />
        </div>
        <div className="budget-grid">
          {/* Turn matching items into JSX with map. Each repeated element needs a stable key so React preserves the right row/control when data changes. */}
          {(filter === "All" ? rows : alerts).map((b) => (
            <Card key={b.id} className="budget-card">
              <div className="flex items-start gap-3 mb-6">
                <span className="entity-icon">
                  <Icon name="pie_chart" />
                </span>
                <div>
                  <h3>{name(b)}</h3>
                  <p className="muted text-[10px] mt-1">Monthly allocation</p>
                </div>
              </div>
              <div className="flex justify-between items-end mb-3">
                <div>
                  <span className="muted text-xs">Spent</span>
                  <strong className="font-mono block text-2xl mt-1">
                    {amount(b.spent_amount)}
                  </strong>
                </div>
                <span className="font-mono muted text-xs">
                  {percent(b.usage_percent)}
                </span>
              </div>
              <Progress
                value={decimal(b.usage_percent)}
                tone={
                  decimal(b.usage_percent) >= 95
                    ? "red"
                    : decimal(b.usage_percent) >= 80
                      ? "amber"
                      : "purple"
                }
              />
              <div className="flex justify-between text-[11px] mt-2">
                <span className="muted">Cap: {amount(b.limit_amount)}</span>
                <span
                  className={
                    decimal(b.remaining_amount) < 0 ? "negative" : "positive"
                  }
                >
                  {amount(b.remaining_amount)} left
                </span>
              </div>
              <div className="split-line" />
              <div className="flex justify-between gap-2 items-center">
                <Badge
                  tone={decimal(b.usage_percent) >= 90 ? "amber" : "green"}
                >
                  {/* Choose one of two UI branches with condition ? trueBranch : falseBranch. This keeps selected/empty/alternate states in the same layout position. */}
                  {decimal(b.remaining_amount) < 0
                    ? "Over Budget"
                    : decimal(b.usage_percent) >= 90
                      ? "Near Limit"
                      : "On Track"}
                </Badge>
                <Button icon="tune" onClick={
                  // Select the editor mode: null starts a new record, an existing row edits it, and undefined closes it. The write happens on form submit, not on this click.
                  () => setEditor(b)
                }>
                  Edit Budget
                </Button>
                <button
                  className="icon-button"
                  aria-label={`Delete ${name(b)}`}
                  onClick={
                    // Remember the selected record for a confirmation dialog, or clear it on close. Selecting it alone does not send DELETE.
                    () => setDeleting(b)
                  }
                >
                  <Icon name="delete" size={15} />
                </button>
              </div>
            </Card>
          ))}
          <button className="new-record-card" onClick={
            // Select the editor mode: null starts a new record, an existing row edits it, and undefined closes it. The write happens on form submit, not on this click.
            () => setEditor(null)
          }>
            <Icon name="add" size={26} />
            <h3>New Category Target</h3>
            <p>Choose an expense category and set its monthly limit.</p>
          </button>
        </div>
        {/* Conditional JSX: render the following block only when the left-hand condition is truthy; otherwise React leaves it out. */}
        {rows.length === 0 && (
          <EmptyState text="No budgets for this month. Create your first envelope." />
        )}
        {/* Budget vs Actual Spending section: the shared Card supplies the existing surface/spacing, while this screen supplies its contents. */}
        <Card
          title="Budget vs Actual Spending"
          subtitle="Side-by-side comparison of current category envelopes"
        >
          <div className="space-y-5">
            {/* Turn matching items into JSX with map. Each repeated element needs a stable key so React preserves the right row/control when data changes. */}
            {rows.map((b) => (
              <div key={b.id}>
                <div className="flex justify-between text-xs gap-3 mb-2">
                  <strong>{name(b)}</strong>
                  <span className="muted font-mono">
                    {amount(b.spent_amount)} / {amount(b.limit_amount)}
                  </span>
                </div>
                <div className="mb-1">
                  <Progress value={100} tone="light" />
                </div>
                <Progress
                  value={decimal(b.usage_percent)}
                  tone={decimal(b.usage_percent) > 95 ? "red" : "green"}
                />
              </div>
            ))}
          </div>
        </Card>
      </ApiBoundary>
      {/* Conditional JSX: render the following block only when the left-hand condition is truthy; otherwise React leaves it out. */}
      {editor !== undefined && (
        <ApiBoundary query={categories}>
          {/* Open the reusable write dialog with the selected record/defaults. Its save flow constructs allowed fields, awaits the API, then refreshes cached reads. */}
          <ResourceEditor
            path="/api/budgets"
            record={editor ?? undefined}
            title={editor ? "Edit Budget" : "Create New Budget"}
            categories={categories.data}
            defaults={{ budget_month: `${month}-01` }}
            onClose={
              // Select the editor mode: null starts a new record, an existing row edits it, and undefined closes it. The write happens on form submit, not on this click.
              () => setEditor(undefined)
            }
          />
        </ApiBoundary>
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
            if (deleting) await mutate(`/api/budgets/${deleting.id}`, "DELETE");
          }
        }
      />
    </div>
  );
}
