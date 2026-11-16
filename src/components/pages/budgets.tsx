"use client";
import { useAmount } from "../use-amount";

import { useState } from "react";
import type { BudgetRead, CategoryRead } from "@/types/api";
import { mutate, useApi } from "@/lib/api-cache";
import { decimal, percent, total } from "@/lib/api-format";
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
  PageHeading,
  Progress,
  Tabs,
} from "../ui/primitives";
import { Icon } from "../ui/icon";
export function Budgets() {
  const amount = useAmount();
  const { month } = useFinance();
  const query = useApi<BudgetRead[]>(`all:/api/budgets?month=${month}-01`);
  const categories = useApi<CategoryRead[]>("all:/api/categories");
  const [filter, setFilter] = useState("All");
  const [editor, setEditor] = useState<BudgetRead | null | undefined>();
  const [deleting, setDeleting] = useState<BudgetRead>();
  const rows = query.data ?? [];
  const alerts = rows.filter((b) => decimal(b.usage_percent) >= 90);
  const name = (b: BudgetRead) =>
    categories.data?.find((c) => c.id === b.category_id)?.name ??
    `Category ${b.category_id}`;
  return (
    <div className="page-stack">
      <PageHeading
        title="Monthly Budgets"
        eyebrow="Financial Planning"
        badge="API Connected"
        description="Plan category thresholds, monitor pacing, and prevent expense overflows"
        actions={
          <Button
            variant="primary"
            icon="add_circle"
            onClick={() => setEditor(null)}
          >
            Create New Budget
          </Button>
        }
      />
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
            onChange={setFilter}
            items={[
              { value: "All", label: `All (${rows.length})` },
              { value: "Alerts", label: `Alerts (${alerts.length})` },
            ]}
          />
        </div>
        <div className="budget-grid">
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
                  {decimal(b.remaining_amount) < 0
                    ? "Over Budget"
                    : decimal(b.usage_percent) >= 90
                      ? "Near Limit"
                      : "On Track"}
                </Badge>
                <Button icon="tune" onClick={() => setEditor(b)}>
                  Edit Budget
                </Button>
                <button
                  className="icon-button"
                  aria-label={`Delete ${name(b)}`}
                  onClick={() => setDeleting(b)}
                >
                  <Icon name="delete" size={15} />
                </button>
              </div>
            </Card>
          ))}
          <button className="new-record-card" onClick={() => setEditor(null)}>
            <Icon name="add" size={26} />
            <h3>New Category Target</h3>
            <p>Choose an expense category and set its monthly limit.</p>
          </button>
        </div>
        {rows.length === 0 && (
          <EmptyState text="No budgets for this month. Create your first envelope." />
        )}
        <Card
          title="Budget vs Actual Spending"
          subtitle="Side-by-side comparison of current category envelopes"
        >
          <div className="space-y-5">
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
      {editor !== undefined && (
        <ApiBoundary query={categories}>
          <ResourceEditor
            path="/api/budgets"
            record={editor ?? undefined}
            title={editor ? "Edit Budget" : "Create New Budget"}
            categories={categories.data}
            defaults={{ budget_month: `${month}-01` }}
            onClose={() => setEditor(undefined)}
          />
        </ApiBoundary>
      )}
      <ConfirmDelete
        key={deleting?.id ?? "none"}
        open={Boolean(deleting)}
        onClose={() => setDeleting(undefined)}
        onConfirm={async () => {
          if (deleting) await mutate(`/api/budgets/${deleting.id}`, "DELETE");
        }}
      />
    </div>
  );
}
