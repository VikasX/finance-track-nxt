"use client";
import { useState } from "react";
import { useFinance } from "../finance-provider";
import {
  amortization,
  calculateEMI,
  dateLabel,
  downloadCSV,
  money,
  sum,
  uid,
} from "@/lib/finance";
import type { Loan } from "@/types/finance";
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
import { RangeField } from "../ui/range-field";
import { AllocationChart } from "../charts";
import { DataTable, type Column } from "../ui/data-table";
export function Loans() {
  const { state, update, notify, month } = useFinance();
  const [principal, setPrincipal] = useState(3000000);
  const [rate, setRate] = useState(8.55);
  const [tenure, setTenure] = useState(20);
  const [unit, setUnit] = useState("Years");
  const [filter, setFilter] = useState("Combined");
  const [newLoan, setNewLoan] = useState(false);
  const [simulator, setSimulator] = useState(false);
  const [target, setTarget] = useState(state.loans[0]?.id ?? "");
  const [prepayMode, setPrepayMode] = useState("Monthly Top-up");
  const [extra, setExtra] = useState(5000);
  const [fullSchedule, setFullSchedule] = useState(false);
  const calculation = calculateEMI(
    principal,
    rate,
    unit === "Years" ? tenure * 12 : tenure,
  );
  const targetLoan = state.loans.find((l) => l.id === target);
  const original = targetLoan
    ? amortization(targetLoan.principal, targetLoan.rate, targetLoan.emi)
    : null;
  const adjusted = targetLoan
    ? amortization(
        targetLoan.principal,
        targetLoan.rate,
        targetLoan.emi,
        prepayMode === "Monthly Top-up" ? extra : 0,
        prepayMode === "One-time Lump Sum" ? extra : 0,
      )
    : null;
  const installments = state.loans
    .filter(
      (l) =>
        filter === "Combined" ||
        (filter === "Home Loan" ? l.kind === "Home" : l.kind === "Vehicle"),
    )
    .flatMap((loan) =>
      amortization(loan.principal, loan.rate, loan.emi)
        .rows.slice(0, fullSchedule ? 240 : 4)
        .map((row, i) => {
          const date = new Date(`${month}-01T12:00:00`);
          date.setMonth(date.getMonth() + i);
          date.setDate(loan.dueDay);
          return {
            ...row,
            id: `${loan.id}-${i}`,
            account: loan.name,
            date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
            status: i === 0 ? "Paid" : i === 1 ? "Next Up" : "Scheduled",
          };
        }),
    )
    .sort((a, b) => a.date.localeCompare(b.date));
  const columns: Column<(typeof installments)[number]>[] = [
    { key: "month", title: "Inst #", render: (r) => `#${r.month}` },
    {
      key: "account",
      title: "Account",
      sort: (r) => r.account,
      render: (r) => <strong>{r.account}</strong>,
    },
    {
      key: "date",
      title: "Due Date",
      sort: (r) => r.date,
      render: (r) => dateLabel(r.date),
    },
    {
      key: "principal",
      title: "Principal (₹)",
      render: (r) => <span className="font-mono">{money(r.principal)}</span>,
    },
    {
      key: "interest",
      title: "Interest (₹)",
      render: (r) => (
        <span className="font-mono muted">{money(r.interest)}</span>
      ),
    },
    {
      key: "payment",
      title: "Total EMI (₹)",
      render: (r) => <strong className="font-mono">{money(r.payment)}</strong>,
    },
    {
      key: "balance",
      title: "Remaining (₹)",
      render: (r) => <span className="font-mono">{money(r.balance)}</span>,
    },
    {
      key: "status",
      title: "Status",
      render: (r) => (
        <Badge
          tone={
            r.status === "Paid"
              ? "green"
              : r.status === "Next Up"
                ? "amber"
                : "gray"
          }
        >
          {r.status}
        </Badge>
      ),
    },
  ];
  const monthlyEMI = sum(state.loans, (l) => l.emi);
  const income = sum(
    state.transactions.filter(
      (t) => t.kind === "income" && t.date.startsWith(month),
    ),
    (t) => t.amount,
  );
  const debtRatio = income ? (monthlyEMI / income) * 100 : 0;
  return (
    <div className="page-stack">
      <PageHeading
        title="Loans & EMI"
        eyebrow="Personal Finance › Liabilities"
        description="Track active liabilities, amortizations, prepayment savings, and monthly schedules"
        actions={
          <>
            <Button icon="insights" onClick={() => setSimulator(true)}>
              Prepayment Simulator
            </Button>
            <Button
              variant="primary"
              icon="add"
              onClick={() => setNewLoan(true)}
            >
              Add New Loan
            </Button>
          </>
        }
      />
      <div className="metric-grid">
        <Metric
          label="Total Outstanding"
          value={money(sum(state.loans, (l) => l.principal))}
          icon="account_balance"
          detail={`Across ${state.loans.length} facilities`}
        />
        <Metric
          label="Monthly EMI Burden"
          value={money(monthlyEMI)}
          icon="credit_card"
          detail={`${debtRatio.toFixed(1)}% of recorded monthly income`}
        />
        <Metric
          label="Active Liabilities"
          value={`${state.loans.length} Accounts`}
          icon="receipt_long"
          detail={`${state.loans.filter((l) => l.kind === "Home").length} Home · ${state.loans.filter((l) => l.kind === "Vehicle").length} Vehicle`}
        />
        <Metric
          label="Debt-Free Projection"
          value="Nov 2038"
          icon="flag"
          detail={<Badge tone="green">Target early exit with top-up EMI</Badge>}
        />
      </div>
      <div className="flex justify-between items-center">
        <h2>Active Accounts</h2>
        <Badge tone="green">Auto-debit status: Healthy</Badge>
      </div>
      <div className="grid-halves">
        {state.loans.map((loan) => (
          <Card key={loan.id}>
            <div className="flex gap-3 items-start">
              <span className="entity-icon !w-11 !h-11">
                <Icon
                  name={loan.kind === "Home" ? "home_work" : "directions_car"}
                  size={23}
                />
              </span>
              <div>
                <h3>
                  {loan.name}{" "}
                  <Badge tone="gray">
                    {loan.kind === "Home" ? "Floating" : "Fixed"}
                  </Badge>
                </h3>
                <p className="muted text-[10px] mt-1">
                  Sanctioned: {money(loan.sanctioned)} · A/C #
                  {loan.id.toUpperCase()}-9830492
                </p>
              </div>
              <div className="ml-auto text-right text-xs">
                <span className="muted text-[10px]">Interest Rate</span>
                <strong className="block font-mono text-violet-700 mt-1">
                  {loan.rate}% p.a.
                </strong>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 my-6">
              {[
                { label: "Current Principal", value: money(loan.principal) },
                { label: "Monthly EMI", value: money(loan.emi) },
                {
                  label: "Next Due Date",
                  value: `0${loan.dueDay} Nov 2024`.slice(
                    loan.dueDay > 9 ? 1 : 0,
                  ),
                },
              ].map((item) => (
                <div key={item.label}>
                  <span className="muted text-[10px]">{item.label}</span>
                  <strong className="block font-mono text-xs mt-1">
                    {item.value}
                  </strong>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[10px] mb-2">
              <strong>
                {((1 - loan.principal / loan.sanctioned) * 100).toFixed(1)}%
                Amortized
              </strong>
              <span className="muted">{loan.months} months remaining</span>
            </div>
            <Progress value={(1 - loan.principal / loan.sanctioned) * 100} />
            <div className="flex justify-between text-[10px] mt-2 muted">
              <span>Paid: {money(loan.sanctioned - loan.principal)}</span>
              <span>Balance: {money(loan.principal)}</span>
            </div>
            <div className="split-line" />
            <div className="flex justify-between items-center gap-2">
              <span className="positive text-[10px] flex gap-1 items-center">
                <Icon name="check_circle" size={14} />
                Auto-debit mandate active
              </span>
              <Button
                onClick={() => {
                  setTarget(loan.id);
                  setSimulator(true);
                }}
              >
                Prepay Principal
              </Button>
            </div>
          </Card>
        ))}
      </div>
      <div className="grid-main">
        <Card
          title="EMI & Amortization Calculator"
          subtitle="Model new loans, adjustments, or simulate rate hikes"
          action={
            <Tabs
              value={unit}
              onChange={(value) => {
                setUnit(value);
                setTenure(value === "Years" ? 20 : 240);
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
                min={5}
                max={18}
                step={0.05}
                suffix="%"
                ticks={["5.0%", "11.5%", "18.0%"]}
              />
              <RangeField
                label={`Tenure (${unit})`}
                value={tenure}
                onChange={setTenure}
                min={1}
                max={unit === "Years" ? 30 : 360}
                suffix={unit === "Years" ? "Yrs" : "Mo"}
                ticks={
                  unit === "Years"
                    ? ["1 Year", "15 Years", "30 Years"]
                    : ["1 Month", "180 Months", "360 Months"]
                }
              />
            </div>
            <div className="rounded-xl bg-slate-50 p-5">
              <span className="metric-label">Monthly EMI</span>
              <strong
                className="block font-mono text-3xl text-violet-700 mt-3"
                data-testid="loan-emi"
              >
                {money(calculation.emi)}
              </strong>
              <p className="muted text-[10px] mt-2">
                Calculated using standard reducing balance
              </p>
              <AllocationChart
                height={180}
                data={[
                  { name: "Principal", value: principal },
                  { name: "Interest", value: calculation.interest },
                ]}
                center={`${((principal / Math.max(calculation.total, 1)) * 100).toFixed(0)}%`}
                caption="Principal"
              />
              <div className="summary-row">
                <span className="muted">Principal Amount</span>
                <strong>{money(principal)}</strong>
              </div>
              <div className="summary-row">
                <span className="muted">Total Interest</span>
                <strong>{money(calculation.interest)}</strong>
              </div>
              <div className="summary-row">
                <span>Total Cost of Loan</span>
                <strong>{money(calculation.total)}</strong>
              </div>
            </div>
          </div>
        </Card>
        <div className="space-y-5">
          <Card className="strategy-card">
            <Badge tone="purple">Smart Strategy</Badge>
            <h2 className="mt-5">Prepay ₹5,000 Extra / Month</h2>
            <p className="muted text-xs mt-3 leading-6">
              Explore how increasing your monthly installment can reduce the
              repayment tenure and compounded interest on your existing loan.
            </p>
            <div className="split-line" />
            <div className="summary-row">
              <span>Without Prepayment</span>
              <strong>Standard EMI</strong>
            </div>
            <div className="summary-row">
              <span>With +₹5k</span>
              <strong className="positive">Earlier completion</strong>
            </div>
            {state.strategy && (
              <div className="info-strip green mt-4 !text-xs">
                Saved: {money(state.strategy.amount)} · {state.strategy.mode}
              </div>
            )}
            <Button
              variant="primary"
              className="w-full mt-6"
              icon="tune"
              onClick={() => setSimulator(true)}
            >
              Configure
            </Button>
          </Card>
          <div className="info-strip green !items-start">
            <Icon name="verified" />
            <p>
              <strong>Debt-to-Income: {debtRatio.toFixed(1)}%</strong>
              <span className="block text-[10px] mt-1">
                Lenders recommend staying below 40%. This ratio uses the
                selected month&apos;s recorded income.
              </span>
            </p>
          </div>
        </div>
      </div>
      <DataTable
        rows={installments}
        columns={columns}
        label="installments"
        toolbar={
          <>
            <div>
              <h2>Amortization & Payment Ledger</h2>
              <p className="muted text-xs mt-1">
                Verified debits and projected schedules across all liabilities
              </p>
            </div>
            <div className="filters">
              <Tabs
                value={filter}
                onChange={setFilter}
                items={["Combined", "Home Loan", "Car Loan"]}
              />
              <Button
                icon="file_download"
                onClick={() =>
                  downloadCSV("fintrack-amortization.csv", [
                    [
                      "Account",
                      "Date",
                      "Principal",
                      "Interest",
                      "EMI",
                      "Balance",
                    ],
                    ...installments.map((r) => [
                      r.account,
                      r.date,
                      r.principal.toFixed(2),
                      r.interest.toFixed(2),
                      r.payment.toFixed(2),
                      r.balance.toFixed(2),
                    ]),
                  ])
                }
              >
                Export Statement
              </Button>
            </div>
          </>
        }
      />
      <div className="text-right">
        <Button
          variant="ghost"
          icon="arrow_forward"
          onClick={() => setFullSchedule(!fullSchedule)}
        >
          {fullSchedule
            ? "Show Upcoming Schedule"
            : "View Complete Payment Schedule"}
        </Button>
      </div>
      <Modal
        open={simulator}
        onClose={() => setSimulator(false)}
        title="Prepayment Impact Simulator"
        subtitle="Calculate how extra payments shorten duration or reduce interest"
      >
        <label className="field mb-5">
          Select Target Account
          <select value={target} onChange={(e) => setTarget(e.target.value)}>
            {state.loans.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} ({money(l.principal)} @ {l.rate}%)
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
                : (targetLoan?.principal ?? 100000)
            }
            step={1000}
            ticks={["₹0", "Extra Principal Payment"]}
          />
        </div>
        {original && adjusted && (
          <div className="grid-halves">
            <div className="info-strip green !block">
              <span className="text-xs">Total Interest Saved</span>
              <strong
                className="block font-mono text-xl mt-2"
                data-testid="interest-saved"
              >
                {money(original.interest - adjusted.interest)}
              </strong>
            </div>
            <div className="info-strip purple !block">
              <span className="text-xs">Tenure Reduced By</span>
              <strong className="block font-mono text-xl mt-2">
                {original.months - adjusted.months} Months
              </strong>
            </div>
          </div>
        )}
        <div className="modal-footer">
          <Button onClick={() => setSimulator(false)}>Cancel</Button>
          <Button
            variant="primary"
            disabled={!targetLoan}
            onClick={() => {
              update((current) => ({
                ...current,
                strategy: { loanId: target, amount: extra, mode: prepayMode },
              }));
              notify("Prepayment strategy saved to your profile.");
              setSimulator(false);
            }}
          >
            Save Strategy to Profile
          </Button>
        </div>
      </Modal>
      <Modal
        open={newLoan}
        onClose={() => setNewLoan(false)}
        title="Add New Loan"
      >
        <RecordForm
          fields={[
            { name: "name", label: "Loan Name" },
            { name: "bank", label: "Bank / Issuer" },
            {
              name: "kind",
              label: "Loan Type",
              type: "select",
              options: ["Home", "Vehicle"],
            },
            {
              name: "sanctioned",
              label: "Sanctioned Amount (₹)",
              type: "number",
              min: 1,
            },
            {
              name: "principal",
              label: "Outstanding Principal (₹)",
              type: "number",
              min: 1,
            },
            {
              name: "rate",
              label: "Interest Rate (%)",
              type: "number",
              min: 0.01,
              max: 30,
            },
            { name: "emi", label: "Monthly EMI (₹)", type: "number", min: 1 },
            {
              name: "months",
              label: "Remaining Months",
              type: "number",
              min: 1,
              max: 600,
              step: "1",
            },
            {
              name: "dueDay",
              label: "Monthly Due Day",
              type: "number",
              min: 1,
              max: 28,
              step: "1",
              value: 5,
            },
          ]}
          onCancel={() => setNewLoan(false)}
          submit="Save Loan"
          onSave={(v) => {
            const record: Loan = {
              id: uid(),
              name: v.name,
              bank: v.bank,
              kind: v.kind as Loan["kind"],
              sanctioned: Number(v.sanctioned),
              principal: Number(v.principal),
              rate: Number(v.rate),
              emi: Number(v.emi),
              months: Number(v.months),
              dueDay: Number(v.dueDay),
            };
            if (
              record.principal > record.sanctioned ||
              record.emi <= (record.principal * record.rate) / 1200
            ) {
              notify(
                "Outstanding must not exceed sanctioned amount, and EMI must cover monthly interest.",
              );
              return;
            }
            update((current) => ({
              ...current,
              loans: [...current.loans, record],
              events: [
                ...current.events,
                {
                  id: `loan-${record.id}-${month}`,
                  title: record.name,
                  amount: record.emi,
                  date: `${month}-${String(record.dueDay).padStart(2, "0")}`,
                  category: "EMI / Loan",
                  paid: false,
                  autoDebit: false,
                  description: `${record.bank} repayment reminder`,
                },
              ],
            }));
            setTarget(record.id);
            notify("Loan added.");
            setNewLoan(false);
          }}
        />
      </Modal>
    </div>
  );
}
