"use client";
import { useAmount } from "../use-amount";

import { useState } from "react";
import type { AmortizationRead, LoanRead } from "@/types/api";
import { mutate, useApi } from "@/lib/api-cache";
import { decimal, total } from "@/lib/api-format";
import {
  amortization,
  calculateEMI,
  dateLabel,
  downloadCSV,
} from "@/lib/finance";
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
  Progress,
  Tabs,
} from "../ui/primitives";
import { RangeField } from "../ui/range-field";
import { DataTable, type Column } from "../ui/data-table";
import { AllocationChart } from "../charts";
import { Icon } from "../ui/icon";
export function Loans() {
  const amount = useAmount();
  const { month } = useFinance();
  const query = useApi<LoanRead[]>("all:/api/loans");
  const [editor, setEditor] = useState<LoanRead | null | undefined>();
  const [deleting, setDeleting] = useState<LoanRead>();
  const [principal, setPrincipal] = useState(3000000);
  const [rate, setRate] = useState(8.55);
  const [tenure, setTenure] = useState(20);
  const [unit, setUnit] = useState("Years");
  const [simulator, setSimulator] = useState(false);
  const [selected, setSelected] = useState("");
  const [extra, setExtra] = useState(5000);
  const [prepayMode, setPrepayMode] = useState("Monthly Top-up");
  const rows = query.data ?? [];
  const target = rows.find((r) => String(r.id) === selected) ?? rows[0];
  const schedule = useApi<AmortizationRead>(
    target ? `/api/loans/${target.id}/amortization` : null,
  );
  const estimate = calculateEMI(
    principal,
    rate,
    unit === "Years" ? tenure * 12 : tenure,
  );
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
  const installments = (schedule.data?.schedule ?? []).map((r) => ({
    ...r,
    id: String(r.installment),
  }));
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
      <PageHeading
        title="Loans & EMI"
        eyebrow="Personal Finance › Liabilities"
        description="Track liabilities, estimated amortization, prepayment scenarios, and scheduled payments"
        actions={
          <>
            <Button
              icon="insights"
              disabled={!rows.length}
              onClick={() => setSimulator(true)}
            >
              Prepayment Simulator
            </Button>
            <Button
              variant="primary"
              icon="add"
              onClick={() => setEditor(null)}
            >
              Add New Loan
            </Button>
          </>
        }
      />
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
                  onClick={() => {
                    setSelected(String(r.id));
                    setSimulator(true);
                  }}
                >
                  Prepay Principal
                </Button>
                <Button icon="edit" onClick={() => setEditor(r)}>
                  Edit
                </Button>
                <button
                  className="icon-button"
                  aria-label={`Delete ${r.loan_name}`}
                  onClick={() => setDeleting(r)}
                >
                  <Icon name="delete" size={15} />
                </button>
              </div>
            </Card>
          ))}
        </div>
        {!rows.length && (
          <Card>
            <EmptyState text="No loans recorded." />
          </Card>
        )}
      </ApiBoundary>
      <div className="grid-main">
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
            onClick={() => setSimulator(true)}
          >
            Configure
          </Button>
        </Card>
      </div>
      <Card
        title="Amortization & Payment Projection"
        subtitle="Original-loan projection, not a paid-installment ledger"
        action={
          <select
            className="filter-select"
            aria-label="Amortization account"
            value={target?.id ?? ""}
            onChange={(e) => setSelected(e.target.value)}
          >
            {rows.map((r) => (
              <option value={r.id} key={r.id}>
                {r.loan_name}
              </option>
            ))}
          </select>
        }
      >
        {target ? (
          <ApiBoundary query={schedule}>
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
                    onClick={() =>
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
      {editor !== undefined && (
        <ResourceEditor
          path="/api/loans"
          record={editor ?? undefined}
          title={editor ? "Edit Loan" : "Add New Loan"}
          defaults={{ start_date: `${month}-01`, status: "active" }}
          onClose={() => setEditor(undefined)}
        />
      )}
      <ConfirmDelete
        key={deleting?.id ?? "none"}
        open={Boolean(deleting)}
        onClose={() => setDeleting(undefined)}
        onConfirm={async () => {
          if (deleting) await mutate(`/api/loans/${deleting.id}`, "DELETE");
        }}
      />
      <Modal
        open={simulator}
        title="Prepayment Impact Simulator"
        subtitle="Estimated impact on the reported outstanding balance"
        onClose={() => setSimulator(false)}
      >
        <label className="field mb-5">
          Select Target Account
          <select
            value={target?.id ?? ""}
            onChange={(e) => setSelected(e.target.value)}
          >
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
          <Button onClick={() => setSimulator(false)}>Close</Button>
        </div>
      </Modal>
    </div>
  );
}
