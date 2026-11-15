"use client";
import { useState } from "react";
import { useFinance } from "../finance-provider";
import { selectSummary } from "@/lib/selectors";
import { money, uid } from "@/lib/finance";
import type { Budget } from "@/types/finance";
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
import { Icon } from "../ui/icon";
export function Budgets() {
  const { state, month, update, notify } = useFinance();
  const summary = selectSummary(state, month);
  const [filter, setFilter] = useState("All");
  const [editing, setEditing] = useState<Budget | null | undefined>();
  const remaining = summary.budgetLimit - summary.budgetSpent;
  const alerts = summary.budgets.filter(
    (b) => (b.spent / b.limit) * 100 >= b.threshold,
  );
  const visible = filter === "All" ? summary.budgets : alerts;
  return (
    <div className="page-stack">
      <PageHeading
        title="Monthly Budgets"
        eyebrow="Financial Planning"
        badge="Cycle Live"
        description="Plan category thresholds, monitor pacing, and prevent expense overflows"
        actions={
          <Button
            variant="primary"
            icon="add_circle"
            onClick={() => setEditing(null)}
          >
            Create New Budget
          </Button>
        }
      />
      <div className="metric-grid transactions-metrics">
        <Metric
          label="Total Monthly Budget"
          value={money(summary.budgetLimit)}
          icon="account_balance_wallet"
          detail={`Aggregated across ${summary.budgets.length} targets`}
        />
        <Metric
          label="Total Spent"
          value={money(summary.budgetSpent)}
          icon="credit_card"
          detail={
            <Badge>
              {summary.budgetLimit
                ? ((summary.budgetSpent / summary.budgetLimit) * 100).toFixed(1)
                : 0}
              %
            </Badge>
          }
          footer={`Avg. ${money(summary.budgetSpent / 20)} / day elapsed`}
        />
        <Metric
          label="Remaining to Spend"
          value={money(remaining)}
          icon="savings"
          detail="11 days left in this billing cycle"
          footer={`Recommended Daily Cap: ${money(remaining / 11)}`}
          tone="positive"
        />
      </div>
      <Card className="!py-5">
        <div className="flex justify-between gap-4 mb-4 text-xs flex-wrap">
          <span className="font-semibold">
            Month Pacing Index{" "}
            <span className="muted font-normal">
              (64.5% of days passed vs{" "}
              {summary.budgetLimit
                ? ((summary.budgetSpent / summary.budgetLimit) * 100).toFixed(1)
                : 0}
              % spent)
            </span>
          </span>
          <span className="muted">
            Actual Spend <span className="text-violet-600 ml-2">●</span>{" "}
            <span className="ml-4">Expected Benchmark (64.5%)</span>
          </span>
        </div>
        <div className="relative">
          <Progress
            value={
              summary.budgetLimit
                ? (summary.budgetSpent / summary.budgetLimit) * 100
                : 0
            }
          />
          <span
            className="absolute w-px h-5 bg-slate-500 -top-1"
            style={{ left: "64.5%" }}
          />
        </div>
      </Card>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2>Category Allocations</h2>
          <p className="muted text-xs mt-1">
            Live telemetry by spending envelope
          </p>
        </div>
        <Tabs
          value={filter}
          onChange={setFilter}
          items={[
            { label: `All (${summary.budgets.length})`, value: "All" },
            { label: `Alerts (${alerts.length})`, value: "Alerts" },
          ]}
        />
      </div>
      <div className="budget-grid">
        {visible.map((b) => {
          const ratio = (b.spent / b.limit) * 100;
          const tone = ratio >= 95 ? "red" : ratio >= 80 ? "amber" : "purple";
          return (
            <Card key={b.id} className="budget-card">
              <div className="flex items-start gap-3 mb-6">
                <span
                  className={`entity-icon ${tone === "red" ? "!bg-rose-50 !text-rose-700" : ""}`}
                >
                  <Icon name={b.icon} size={21} />
                </span>
                <div>
                  <h3>{b.name}</h3>
                  <p className="muted text-[10px] mt-1">{b.description}</p>
                </div>
              </div>
              <div className="flex items-end justify-between mb-3">
                <div>
                  <span className="muted text-xs">Spent</span>
                  <strong className="block font-mono text-2xl tracking-tight mt-1">
                    {money(b.spent)}
                  </strong>
                </div>
                <span className="font-mono muted text-xs">
                  {ratio.toFixed(1)}%
                </span>
              </div>
              <Progress value={ratio} tone={tone} />
              <div className="flex justify-between mt-2 text-[11px]">
                <span className="muted">Cap: {money(b.limit)}</span>
                <span className={ratio >= 95 ? "negative" : "positive"}>
                  {money(b.limit - b.spent)} left
                </span>
              </div>
              <div className="split-line" />
              <div className="flex items-center justify-between gap-2 mb-4">
                <span className="muted text-[10px]">
                  Avg. Daily Spend: {money(b.spent / 20)}/day
                </span>
                <Badge
                  tone={
                    tone === "red"
                      ? "red"
                      : tone === "amber"
                        ? "amber"
                        : "green"
                  }
                >
                  {ratio >= 95
                    ? "Overbudget Alert"
                    : ratio >= 85
                      ? "Near Limit"
                      : ratio >= 75
                        ? "High Burn Rate"
                        : "On Track"}
                </Badge>
              </div>
              <Button
                icon="tune"
                className="w-full"
                onClick={() => setEditing(b)}
              >
                Edit Budget
              </Button>
            </Card>
          );
        })}
        <button className="new-record-card" onClick={() => setEditing(null)}>
          <span className="entity-icon !rounded-full">
            <Icon name="add" size={26} />
          </span>
          <h3>New Category Target</h3>
          <p>
            Define personalized allocations for health, vacations or education
          </p>
        </button>
      </div>
      <Card
        title="Budget vs Actual Spending"
        subtitle="Side-by-side volume distribution across current cycle envelopes"
      >
        <div className="flex justify-end gap-4 muted text-[10px] mb-5">
          <span>▰ Planned Target</span>
          <span className="text-violet-700">▰ Actual Spent</span>
        </div>
        <div className="space-y-5">
          {summary.budgets.map((budget) => (
            <div key={budget.id}>
              <div className="flex justify-between gap-3 text-xs mb-2">
                <strong>{budget.name}</strong>
                <span className="font-mono muted text-[10px]">
                  {money(budget.spent)} / {money(budget.limit)} ·{" "}
                  {((budget.spent / budget.limit) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="mb-1">
                <Progress value={100} tone="light" />
              </div>
              <Progress
                value={(budget.spent / budget.limit) * 100}
                tone={
                  budget.spent / budget.limit >= 0.95
                    ? "red"
                    : budget.spent / budget.limit >= 0.8
                      ? "amber"
                      : "green"
                }
              />
            </div>
          ))}
        </div>
      </Card>
      <Modal
        open={editing !== undefined}
        onClose={() => setEditing(undefined)}
        title={editing ? "Edit Budget" : "Create New Budget"}
      >
        <RecordForm
          fields={[
            {
              name: "name",
              label: "Category Envelope",
              type: "select",
              value: editing?.name,
              options: Array.from(
                new Set([
                  ...state.categories.filter(
                    (c) =>
                      ![
                        "Salary",
                        "Freelance",
                        "Dividends",
                        "Interest",
                        "Loan / EMI",
                        "Investment",
                      ].includes(c),
                  ),
                  "Health & Medical",
                  "Personal Care",
                ]),
              ),
            },
            {
              name: "limit",
              label: "Monthly Limit (₹)",
              type: "number",
              min: 1,
              value: editing?.limit,
            },
            {
              name: "threshold",
              label: "Pacing Alert Threshold",
              type: "select",
              options: ["80", "90"],
              value: editing?.threshold ?? 80,
            },
            {
              name: "rollover",
              label: "Surplus Auto-Rollover",
              type: "checkbox",
              value: editing?.rollover,
            },
          ]}
          onCancel={() => setEditing(undefined)}
          submit="Save Envelope"
          onSave={(values) => {
            const existing = state.budgets.find(
              (b) => b.name === values.name && b.id !== editing?.id,
            );
            if (existing) {
              notify(
                "A budget already exists for this category. Edit its envelope instead.",
              );
              return;
            }
            const record: Budget = {
              id: editing?.id ?? uid(),
              name: values.name,
              limit: Number(values.limit),
              description:
                editing?.description ?? "Personalized monthly allocation",
              threshold: Number(values.threshold),
              rollover: values.rollover === "on",
              icon: editing?.icon ?? "account_balance_wallet",
            };
            update((current) => ({
              ...current,
              budgets: editing
                ? current.budgets.map((b) => (b.id === editing.id ? record : b))
                : [...current.budgets, record],
              categories: Array.from(
                new Set([...current.categories, record.name]),
              ),
            }));
            notify("Budget envelope saved.");
            setEditing(undefined);
          }}
        >
          <p className="info-strip mt-5">
            <Icon name="info" />
            Thresholds and rollover preferences are stored with this demo
            envelope.
          </p>
        </RecordForm>
      </Modal>
    </div>
  );
}
