"use client";
import { useState } from "react";
import { useFinance } from "../finance-provider";
import { selectSummary } from "@/lib/selectors";
import { bankRates } from "@/lib/mock-data";
import { calculateFD, dateLabel, money, sum, uid } from "@/lib/finance";
import { downloadPDF } from "@/lib/export";
import type { Deposit } from "@/types/finance";
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
import { RangeField } from "../ui/range-field";
import { Icon } from "../ui/icon";
import { DataTable, type Column } from "../ui/data-table";
function depositYears(deposit: Deposit) {
  return (
    (new Date(deposit.maturityDate).getTime() -
      new Date(deposit.startDate).getTime()) /
    (365.25 * 86400000)
  );
}
export function Deposits() {
  const { state, update, notify, month } = useFinance();
  const summary = selectSummary(state, month);
  const [filter, setFilter] = useState("All");
  const [editor, setEditor] = useState<Deposit | null | undefined>();
  const [principal, setPrincipal] = useState(100000);
  const [rate, setRate] = useState(7.25);
  const [years, setYears] = useState(3);
  const [frequency, setFrequency] = useState("Quarterly");
  const [tenure, setTenure] = useState("2 Years - 3 Years");
  const calculation = calculateFD(
    principal,
    rate,
    years,
    frequency === "Monthly" ? 12 : frequency === "Quarterly" ? 4 : 1,
  );
  const weighted = summary.deposits
    ? sum(state.deposits, (d) => d.principal * d.rate) / summary.deposits
    : 0;
  const rows = state.deposits.filter(
    (d) =>
      filter === "All" ||
      (filter === "Tax Savers"
        ? d.kind === "Tax Saver"
        : d.maturityDate <= "2024-12-31"),
  );
  const banks = bankRates;
  const rateOffset = tenure.startsWith("1")
    ? -0.15
    : tenure.startsWith("5")
      ? -0.25
      : 0;
  const bankColumns: Column<(typeof banks)[number]>[] = [
    {
      key: "bank",
      title: "Bank / Issuer",
      render: (b) => <strong>{b.name}</strong>,
    },
    {
      key: "rate",
      title: "Regular Citizens",
      sort: (b) => b.rate,
      render: (b) => (
        <span className="font-mono">{(b.rate + rateOffset).toFixed(2)}%</span>
      ),
    },
    {
      key: "senior",
      title: "Senior Citizens",
      sort: (b) => b.senior,
      render: (b) => (
        <strong className="font-mono positive">
          {(b.senior + rateOffset).toFixed(2)}%
        </strong>
      ),
    },
    {
      key: "special",
      title: "Special Tenure Rates",
      render: (b) => <span className="muted text-xs">{b.special}</span>,
    },
    {
      key: "action",
      title: "Action",
      render: (b) => (
        <Button
          variant="ghost"
          onClick={() => {
            setRate(b.rate + rateOffset);
            setEditor({
              id: "",
              name: `${b.name} FD`,
              bank: b.name,
              principal,
              rate: b.rate + rateOffset,
              startDate: `${month}-22`,
              maturityDate: `${Number(month.slice(0, 4)) + years}${month.slice(4)}-22`,
              kind: "Regular",
              instruction: "Payout to Primary Account",
            });
          }}
        >
          Book FD
        </Button>
      ),
    },
  ];
  return (
    <div className="page-stack">
      <Card>
        <PageHeading
          title="Fixed Deposits"
          badge="Guaranteed Yield"
          description="Guaranteed return deposits, accrued interest analytics, and maturity milestones."
          actions={
            <>
              <Button
                icon="file_download"
                onClick={() =>
                  downloadPDF(
                    "fintrack-interest-summary.pdf",
                    "Fixed Deposit Interest / TDS Summary",
                    [
                      ["Bank", "Principal", "Rate", "Maturity Date"],
                      ...state.deposits.map((d) => [
                        d.bank,
                        d.principal,
                        `${d.rate}%`,
                        d.maturityDate,
                      ]),
                    ],
                  )
                }
              >
                Download TDS Certificate
              </Button>
              <Button
                variant="primary"
                icon="add_circle"
                onClick={() => setEditor(null)}
              >
                Open New FD
              </Button>
            </>
          }
        />
      </Card>
      <div className="metric-grid">
        <Metric
          label="Total FD Value"
          value={money(summary.deposits)}
          icon="account_balance_wallet"
          detail={<Badge tone="green">↗ 100% Capital Safe</Badge>}
        />
        <Metric
          label="Accrued Interest"
          value={money(
            sum(
              state.deposits,
              (d) =>
                calculateFD(
                  d.principal,
                  d.rate,
                  Math.max(
                    0,
                    (new Date("2024-10-31").getTime() -
                      new Date(d.startDate).getTime()) /
                      (365.25 * 86400000),
                  ),
                ).interest,
            ),
          )}
          icon="savings"
          tone="positive"
          detail="Interest accrued across all quarters"
        />
        <Metric
          label="Weighted Avg. Return"
          value={`${weighted.toFixed(2)}%`}
          icon="percent"
          detail="p.a. · Weighted by principal"
        />
        <Metric
          label="Active Deposits"
          value={`${state.deposits.length} FDs`}
          icon="account_balance"
          detail={`Distributed across ${new Set(state.deposits.map((d) => d.bank)).size} scheduled banks`}
        />
      </div>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2>Your Fixed Deposit Portfolio</h2>
          <p className="muted text-xs">
            Real-time status, growth accumulation, and term completions
          </p>
        </div>
        <Tabs
          value={filter}
          onChange={setFilter}
          items={["All", "Maturing Soon", "Tax Savers"]}
        />
      </div>
      <div className="deposit-grid">
        {rows.map((d) => {
          const payout = calculateFD(
            d.principal,
            d.rate,
            depositYears(d),
          ).maturity;
          const soon = d.maturityDate <= "2024-12-31";
          return (
            <Card key={d.id} className="!p-4">
              <div className="flex gap-3 items-start">
                <span className="entity-icon">
                  {d.bank.slice(0, 2).toUpperCase()}
                </span>
                <div>
                  <h3 className="!text-sm">{d.name}</h3>
                  <small className="muted text-[10px]">
                    FD# {d.id.toUpperCase()}-7840192
                  </small>
                </div>
                <div className="ml-auto">
                  <Badge
                    tone={
                      soon ? "red" : d.kind === "Tax Saver" ? "purple" : "green"
                    }
                  >
                    {soon
                      ? "Maturing Soon"
                      : d.kind === "Tax Saver"
                        ? "Sec 80C Lock"
                        : "Active"}
                  </Badge>
                </div>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 mt-5">
                <div className="summary-row">
                  <span className="muted">Principal Amount</span>
                  <strong>{money(d.principal)}</strong>
                </div>
                <div className="summary-row">
                  <span className="muted">Interest Rate</span>
                  <strong className="positive">
                    {d.rate.toFixed(2)}% p.a.
                  </strong>
                </div>
                <div className="summary-row">
                  <span className="muted">Tenure</span>
                  <span>{Math.round(depositYears(d))} Years</span>
                </div>
                <div className="summary-row">
                  <span className="muted">Maturity Payout</span>
                  <strong className="text-violet-700">{money(payout)}</strong>
                </div>
              </div>
              <div className="text-[10px] flex justify-between gap-2 mt-4 mb-2">
                <span>Maturity: {dateLabel(d.maturityDate)}</span>
                <span className={soon ? "negative" : "muted"}>
                  {Math.max(
                    0,
                    Math.ceil(
                      (new Date(d.maturityDate).getTime() -
                        new Date("2024-10-31").getTime()) /
                        86400000,
                    ),
                  )}{" "}
                  Days Left
                </span>
              </div>
              <Progress
                value={
                  (100 *
                    (new Date("2024-10-31").getTime() -
                      new Date(d.startDate).getTime())) /
                  (new Date(d.maturityDate).getTime() -
                    new Date(d.startDate).getTime())
                }
                tone={soon ? "red" : "purple"}
              />
              <div className="flex justify-between items-center mt-5 text-[10px] muted">
                <span>
                  {d.kind === "Tax Saver" ? "5Y Mandatory Lock" : "Bank Credit"}
                </span>
                <Button
                  className="!text-[10px] !py-1 !min-h-6"
                  onClick={() => setEditor(d)}
                >
                  {soon ? "Manage Payout" : "Details"}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
      <div className="grid-halves">
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
              min={3}
              max={11}
              step={0.05}
              suffix="%"
              ticks={["3.0%", "7.5%", "11.0%"]}
            />
            <RangeField
              label="Tenure (Years)"
              value={years}
              onChange={setYears}
              min={1}
              max={10}
              suffix="Yrs"
              ticks={["1 Yr", "5 Yrs", "10 Yrs"]}
            />
            <div>
              <span className="field-label">Compounding Frequency</span>
              <Tabs
                value={frequency}
                onChange={setFrequency}
                items={["Quarterly", "Monthly", "Cumulative"]}
              />
              <p className="muted text-[10px] mt-3">
                Cumulative uses annual compounding in this estimate.
              </p>
            </div>
          </div>
          <div className="calculator-result">
            <div>
              <div className="summary-row">
                <span>Principal Invested</span>
                <strong>{money(principal)}</strong>
              </div>
              <div className="summary-row">
                <span>Total Interest Earned</span>
                <strong className="positive">
                  {money(calculation.interest)}
                </strong>
              </div>
              <Progress
                value={(principal / calculation.maturity) * 100}
                tone="green"
              />
            </div>
            <div className="calculator-total">
              <span className="metric-label">Maturity Payout</span>
              <strong data-testid="fd-maturity">
                {money(calculation.maturity)}
              </strong>
              <Badge tone="green">Guaranteed Maturity</Badge>
            </div>
          </div>
          <div className="flex justify-between gap-4 items-center mt-6">
            <p className="muted text-[10px]">
              * Assumes a constant annual rate without early withdrawal penalty.
            </p>
            <Button
              variant="ghost"
              icon="arrow_forward"
              onClick={() => setEditor(null)}
            >
              Book at this rate
            </Button>
          </div>
        </Card>
        <Card
          title="Maturity Milestones"
          subtitle="Scheduled payouts & automated instructions"
        >
          <div className="space-y-5">
            {state.deposits.map((d, index) => (
              <div className="flex gap-3" key={d.id}>
                <span className="milestone-number">{index + 1}</span>
                <div className="flex-1 bg-slate-50 p-3 rounded-lg">
                  <div className="flex justify-between text-xs">
                    <strong>{d.name}</strong>
                    <strong className="font-mono">
                      {money(
                        calculateFD(d.principal, d.rate, depositYears(d))
                          .maturity,
                      )}
                    </strong>
                  </div>
                  <p className="muted text-[10px] mt-1 mb-4">
                    {dateLabel(d.maturityDate)}
                  </p>
                  <label className="field !text-[10px]">
                    Maturity Action
                    <select
                      value={d.instruction}
                      onChange={(e) => {
                        const instruction = e.target.value;
                        update((current) => ({
                          ...current,
                          deposits: current.deposits.map((item) =>
                            item.id === d.id ? { ...item, instruction } : item,
                          ),
                        }));
                        notify("Maturity instruction saved locally.");
                      }}
                    >
                      <option>Reinvest Principal & Interest</option>
                      <option>Payout to Primary Account</option>
                      <option>Payout to Linked Savings</option>
                      <option>Reinvest Principal only, payout interest</option>
                    </select>
                  </label>
                </div>
              </div>
            ))}
          </div>
          <div className="info-strip purple mt-6 !text-[10px]">
            <Icon name="notifications" />
            Reminder preferences can be configured in Settings. External alerts
            require a future integration.
          </div>
        </Card>
      </div>
      <DataTable
        rows={banks}
        columns={bankColumns}
        pageSize={4}
        label="banks"
        toolbar={
          <>
            <div>
              <h2>Comparative Bank Fixed Deposit Rates</h2>
              <p className="muted text-xs mt-1">
                Illustrative institutional rates from the October 2024 design
              </p>
            </div>
            <label className="text-xs muted">
              Tenure Filter:{" "}
              <select
                aria-label="Bank rate tenure"
                className="filter-select"
                value={tenure}
                onChange={(e) => setTenure(e.target.value)}
              >
                {[
                  "1 Year - 2 Years",
                  "2 Years - 3 Years",
                  "3 Years - 5 Years",
                  "5 Years (Tax Saver)",
                ].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
          </>
        }
      />
      <Modal
        open={editor !== undefined}
        onClose={() => setEditor(undefined)}
        title={
          editor?.id ? "Manage Fixed Deposit" : "Record / Open Fixed Deposit"
        }
      >
        <RecordForm
          fields={[
            {
              name: "bank",
              label: "Financial Institution",
              type: "select",
              options: [
                "Axis Bank",
                "HDFC Bank",
                "ICICI Bank",
                "State Bank of India",
                "Kotak Mahindra Bank",
              ],
              value: editor?.bank,
            },
            {
              name: "name",
              label: "Deposit Name",
              value: editor?.name ?? "New Fixed Deposit",
            },
            {
              name: "principal",
              label: "Principal Amount (₹)",
              type: "number",
              min: 1,
              value: editor?.principal ?? principal,
            },
            {
              name: "rate",
              label: "Interest Rate (% p.a.)",
              type: "number",
              min: 0.01,
              max: 20,
              value: editor?.rate ?? rate,
            },
            {
              name: "startDate",
              label: "Start Date",
              type: "date",
              value: editor?.startDate ?? `${month}-22`,
            },
            {
              name: "maturityDate",
              label: "Maturity Date",
              type: "date",
              value:
                editor?.maturityDate ??
                `${Number(month.slice(0, 4)) + years}${month.slice(4)}-22`,
            },
            {
              name: "kind",
              label: "Deposit Type",
              type: "select",
              options: ["Regular", "Tax Saver", "Senior"],
              value: editor?.kind,
            },
          ]}
          onCancel={() => setEditor(undefined)}
          submit="Save Deposit"
          onSave={(values) => {
            if (values.maturityDate <= values.startDate) {
              notify("Maturity date must be after the start date.");
              return;
            }
            const record: Deposit = {
              id: editor?.id || uid(),
              name: values.name,
              bank: values.bank,
              principal: Number(values.principal),
              rate: Number(values.rate),
              startDate: values.startDate,
              maturityDate: values.maturityDate,
              kind: values.kind as Deposit["kind"],
              instruction: editor?.instruction ?? "Payout to Primary Account",
            };
            update((current) => ({
              ...current,
              deposits: editor?.id
                ? current.deposits.map((d) => (d.id === editor.id ? record : d))
                : [...current.deposits, record],
              events: [
                ...current.events.filter(
                  (event) => event.id !== `deposit-${record.id}`,
                ),
                {
                  id: `deposit-${record.id}`,
                  title: `${record.bank} FD Maturity`,
                  amount: Math.round(
                    calculateFD(
                      record.principal,
                      record.rate,
                      depositYears(record),
                    ).maturity,
                  ),
                  date: record.maturityDate,
                  category: "Maturity",
                  paid: false,
                  autoDebit: true,
                  description: "Principal + Interest credit",
                },
              ],
            }));
            notify("Deposit saved locally. No bank order was placed.");
            setEditor(undefined);
          }}
        />
      </Modal>
    </div>
  );
}
