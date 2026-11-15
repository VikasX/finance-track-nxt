"use client";
import { useState } from "react";
import { useFinance } from "../finance-provider";
import { selectPPFLedger, selectSummary } from "@/lib/selectors";
import { dateLabel, downloadCSV, money, sum, uid } from "@/lib/finance";
import { downloadPDF } from "@/lib/export";
import type { Contribution, SavingsGoal } from "@/types/finance";
import {
  Badge,
  Button,
  Card,
  Metric,
  Modal,
  PageHeading,
  Progress,
  RecordForm,
} from "../ui/primitives";
import { Icon } from "../ui/icon";
import { DataTable, type Column } from "../ui/data-table";
export function Savings() {
  const { state, month, update, notify } = useFinance();
  const summary = selectSummary(state, month);
  const [contributionOpen, setContributionOpen] = useState(false);
  const [goalEditor, setGoalEditor] = useState<
    SavingsGoal | null | undefined
  >();
  const [autoDebit, setAutoDebit] = useState(false);
  const [receipt, setReceipt] = useState(false);
  const room = Math.max(0, 150000 - summary.contribution);
  const ledger = selectPPFLedger(state);
  const columns: Column<(typeof ledger)[number]>[] = [
    {
      key: "date",
      title: "Financial Year / Date",
      sort: (r) => r.date,
      render: (r) => (
        <div>
          <strong>{r.year}</strong>
          <small className="block muted text-[10px] mt-1">{r.reference}</small>
        </div>
      ),
    },
    {
      key: "opening",
      title: "Opening Balance",
      render: (r) => <span className="font-mono">{money(r.opening)}</span>,
    },
    {
      key: "deposit",
      title: "Deposit (₹)",
      render: (r) => <strong className="font-mono">{money(r.deposit)}</strong>,
    },
    {
      key: "interest",
      title: "Interest (7.1%)",
      render: (r) => (
        <span className="font-mono positive">
          +{money(r.interest)}
          {r.projected ? " (Proj.)" : ""}
        </span>
      ),
    },
    {
      key: "closing",
      title: "Closing Balance",
      render: (r) => <strong className="font-mono">{money(r.closing)}</strong>,
    },
    {
      key: "reference",
      title: "Tax Exemption",
      render: () => <Badge tone="green">Sec 80C</Badge>,
    },
  ];
  const exportRows = [
    ["Year", "Opening", "Deposit", "Interest", "Closing", "Reference"],
    ...ledger.map((r) => [
      r.year,
      r.opening,
      r.deposit,
      r.interest,
      r.closing,
      r.reference,
    ]),
  ];
  return (
    <div className="page-stack">
      <PageHeading
        title="PPF & Savings"
        eyebrow="Tax Sovereign Reserve"
        badge="Sovereign EEE Status"
        description="Long-term statutory savings, tax-exempt wealth accumulation, and life goals"
        actions={
          <>
            <Button icon="receipt_long" onClick={() => setReceipt(true)}>
              Contribution Receipt
            </Button>
            <Button
              variant="primary"
              icon="add_circle"
              onClick={() => setContributionOpen(true)}
            >
              Log Contribution
            </Button>
          </>
        }
      />
      <div className="metric-grid">
        <Metric
          label="Total PPF Balance"
          value={money(summary.ppf)}
          icon="account_balance"
          detail={
            <>
              <Badge tone="green">+7.1%</Badge>Sovereign Govt Backed
            </>
          }
        />
        <Metric
          label="FY 2024–25 Contribution"
          value={money(summary.contribution)}
          icon="savings"
          detail={
            <>
              <Badge>
                {((summary.contribution / 150000) * 100).toFixed(0)}%
              </Badge>
              Sec 80C {money(room)} room
            </>
          }
        />
        <Metric
          label="Govt Interest Rate"
          value="7.10% p.a."
          icon="percent"
          detail="Annual Compounding · Q3 Confirmed"
        />
        <Metric
          label="Statutory Maturity"
          value="Year 2035"
          icon="lock_clock"
          detail="Year 4 of 15 completed · 11 yrs left"
        />
      </div>
      <Card
        title="PPF Contribution Tracker & Sec 80C Cap Gauge"
        subtitle="Statutory exemption limit capped under Indian Income Tax Act Section 80C"
        action={<Badge>FY 2024–25</Badge>}
      >
        <div className="flex justify-between items-end gap-4 mb-4">
          <div>
            <span className="muted text-xs">Utilized Allocation:</span>
            <strong className="block font-mono text-2xl mt-2">
              {money(summary.contribution)}{" "}
              <span className="muted text-xs font-normal">
                of ₹1,50,000 ceiling
              </span>
            </strong>
          </div>
          <strong className="font-mono text-violet-700">
            {((summary.contribution / 150000) * 100).toFixed(1)}%
          </strong>
        </div>
        <Progress value={(summary.contribution / 150000) * 100} />
        <div className="flex justify-between text-xs mt-3 gap-3 flex-wrap">
          <span className="positive">
            Deposited to Date: {money(summary.contribution)}
          </span>
          <span className="muted">
            Remaining Tax Exemption Room: {money(room)}
          </span>
        </div>
        <div className="info-strip purple mt-6">
          <Icon name="lightbulb" size={22} />
          <div className="flex-1">
            <strong className="text-xs">Optimized Compounding Strategy</strong>
            <p className="text-[11px] mt-1">
              Deposit ₹12,500/mo on or before the 5th of every month to capture
              compounding for that entire month.
            </p>
          </div>
          <Button variant="ghost" onClick={() => setAutoDebit(true)}>
            Setup Auto-Debit SIP →
          </Button>
        </div>
      </Card>
      <div className="flex justify-between items-center gap-3">
        <div>
          <h2>Life Savings Goals</h2>
          <p className="muted text-xs mt-1">
            Target wealth horizons paired with automated savings transfers
          </p>
        </div>
        <Badge tone="gray">
          Monthly SIP Total: {money(sum(state.goals, (g) => g.sip))}
        </Badge>
      </div>
      <div className="goals-grid">
        {state.goals.map((goal) => (
          <button
            className="card goal-card text-left"
            key={goal.id}
            onClick={() => setGoalEditor(goal)}
            aria-label={`Edit ${goal.name}`}
          >
            <div className="flex justify-between items-center mb-5">
              <span className="entity-icon !w-11 !h-11">
                <Icon name={goal.icon} size={22} />
              </span>
              <Badge tone="green">
                {((goal.saved / goal.target) * 100).toFixed(0)}%
              </Badge>
            </div>
            <h3>{goal.name}</h3>
            <p className="muted text-[10px] mt-1 mb-5">{goal.description}</p>
            <div className="flex justify-between text-[10px] mb-2">
              <span className="muted">
                Saved{" "}
                <strong className="font-mono text-slate-800">
                  {money(goal.saved)}
                </strong>
              </span>
              <span className="muted">Target {money(goal.target)}</span>
            </div>
            <Progress value={(goal.saved / goal.target) * 100} tone="green" />
            <div className="flex justify-between text-[10px] mt-5">
              <span className="positive">↻ {money(goal.sip)}/mo SIP</span>
              <span className="muted">
                {dateLabel(goal.date, { month: "short", year: "numeric" })}
              </span>
            </div>
          </button>
        ))}
        <button className="new-record-card" onClick={() => setGoalEditor(null)}>
          <Icon name="add" size={26} />
          <h3>Create New Goal</h3>
          <p>Car purchase, education corpus, or custom emergency milestone</p>
          <span className="text-violet-700 font-semibold text-xs">
            Configure Goal →
          </span>
        </button>
      </div>
      <DataTable
        rows={ledger}
        columns={columns}
        label="contribution entries"
        toolbar={
          <>
            <div>
              <h2>PPF Annual Ledger & Interest Compounding</h2>
              <p className="muted text-xs mt-1">
                Contribution passbook · Annual interest is credited at financial
                year-end
              </p>
            </div>
            <div className="filters">
              <Button
                icon="download"
                onClick={() =>
                  downloadCSV("fintrack-ppf-ledger.csv", exportRows)
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
      <div className="info-strip">
        <Icon name="info" />
        <span>
          Opening balance: {money(state.balances.ppfOpening)}. Annual interest
          projection:{" "}
          <strong className="positive">{money(summary.ppf * 0.071)}</strong>.
          Actual credit depends on qualifying monthly balances and the
          applicable rate.
        </span>
      </div>
      <Modal
        open={contributionOpen}
        onClose={() => setContributionOpen(false)}
        title="Log PPF Contribution"
        subtitle="Record deposit for statutory tax documentation"
      >
        <RecordForm
          fields={[
            {
              name: "amount",
              label: "Contribution Amount (₹)",
              type: "number",
              min: 1,
              max: room,
            },
            {
              name: "date",
              label: "Deposit Date",
              type: "date",
              value: `${month}-22`,
            },
            {
              name: "method",
              label: "Payment Method",
              type: "select",
              options: [
                "NetBanking / NEFT",
                "UPI Mandate",
                "Bank Standing Order",
                "Cheque / Branch Remittance",
              ],
            },
            { name: "reference", label: "Bank Reference / UTR Number" },
          ]}
          onCancel={() => setContributionOpen(false)}
          submit="Record Deposit"
          onSave={(v) => {
            if (Number(v.amount) > room || Number(v.amount) <= 0) {
              notify("Contribution exceeds the remaining annual allowance.");
              return;
            }
            if (v.date < "2024-04-01" || v.date > "2025-03-31") {
              notify("Choose a deposit date in FY 2024–25.");
              return;
            }
            const record: Contribution = {
              id: uid(),
              amount: Number(v.amount),
              date: v.date,
              method: v.method,
              reference: v.reference,
            };
            update((current) => ({
              ...current,
              contributions: [...current.contributions, record].sort((a, b) =>
                a.date.localeCompare(b.date),
              ),
            }));
            notify("PPF contribution recorded.");
            setContributionOpen(false);
          }}
        >
          <p className="info-strip mt-5">
            Maximum permissible contribution remaining for FY 24–25:{" "}
            {money(room)}
          </p>
        </RecordForm>
      </Modal>
      <Modal
        open={goalEditor !== undefined}
        onClose={() => setGoalEditor(undefined)}
        title={goalEditor ? "Configure Savings Goal" : "Create New Goal"}
      >
        <RecordForm
          fields={[
            { name: "name", label: "Goal Name", value: goalEditor?.name },
            {
              name: "description",
              label: "Description",
              value: goalEditor?.description,
            },
            {
              name: "saved",
              label: "Already Saved (₹)",
              type: "number",
              min: 0,
              value: goalEditor?.saved ?? 0,
            },
            {
              name: "target",
              label: "Target Amount (₹)",
              type: "number",
              min: 1,
              value: goalEditor?.target,
            },
            {
              name: "sip",
              label: "Monthly SIP (₹)",
              type: "number",
              min: 0,
              value: goalEditor?.sip ?? 0,
            },
            {
              name: "date",
              label: "Target Date",
              type: "date",
              value: goalEditor?.date,
            },
          ]}
          onCancel={() => setGoalEditor(undefined)}
          submit="Save Goal"
          onSave={(v) => {
            const record: SavingsGoal = {
              id: goalEditor?.id ?? uid(),
              name: v.name,
              description: v.description,
              saved: Number(v.saved),
              target: Number(v.target),
              sip: Number(v.sip),
              date: v.date,
              icon: goalEditor?.icon ?? "flag",
            };
            update((current) => ({
              ...current,
              goals: goalEditor
                ? current.goals.map((g) =>
                    g.id === goalEditor.id ? record : g,
                  )
                : [...current.goals, record],
            }));
            notify("Savings goal saved.");
            setGoalEditor(undefined);
          }}
        />
      </Modal>
      <Modal
        open={autoDebit}
        onClose={() => setAutoDebit(false)}
        title="Configure PPF Contribution Schedule"
      >
        <RecordForm
          fields={[
            {
              name: "amount",
              label: "Monthly Contribution (₹)",
              type: "number",
              min: 1,
              max: room,
              value: Math.min(12500, room),
            },
            {
              name: "date",
              label: "Next Contribution Date",
              type: "date",
              value: "2024-11-04",
            },
          ]}
          onCancel={() => setAutoDebit(false)}
          submit="Save Contribution Reminder"
          onSave={(v) => {
            update((current) => ({
              ...current,
              events: [
                ...current.events,
                {
                  id: uid(),
                  title: "PPF Monthly Contribution",
                  amount: Number(v.amount),
                  date: v.date,
                  category: "SIP / Mutual Fund",
                  autoDebit: false,
                  paid: false,
                  description: "PPF scheduled contribution reminder",
                },
              ],
            }));
            notify("Contribution reminder added. No bank mandate was created.");
            setAutoDebit(false);
          }}
        />
      </Modal>
      <Modal
        open={receipt}
        onClose={() => setReceipt(false)}
        title="PPF Contribution Receipt"
      >
        <div className="summary-row">
          <span>FY 2024–25 Deposits</span>
          <strong>{money(summary.contribution)}</strong>
        </div>
        {state.contributions.map((c) => (
          <div className="summary-row" key={c.id}>
            <span>
              {dateLabel(c.date)} · {c.reference}
            </span>
            <strong>{money(c.amount)}</strong>
          </div>
        ))}
        <Button
          variant="primary"
          icon="download"
          className="mt-5"
          onClick={() =>
            downloadPDF(
              "fintrack-ppf-receipt.pdf",
              "PPF Contribution Receipt",
              exportRows,
            )
          }
        >
          Download Receipt
        </Button>
      </Modal>
    </div>
  );
}
