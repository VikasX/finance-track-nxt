"use client";
import { useAmount } from "../use-amount";

import { useState } from "react";
import type { FixedDepositRead } from "@/types/api";
import { mutate, useApi } from "@/lib/api-cache";
import { decimal, total } from "@/lib/api-format";
import { calculateFD, dateLabel } from "@/lib/finance";
import { downloadPDF } from "@/lib/export";
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
  Tabs,
} from "../ui/primitives";
import { RangeField } from "../ui/range-field";
import { Icon } from "../ui/icon";
export function Deposits() {
  const amount = useAmount();
  const { month } = useFinance();
  const query = useApi<FixedDepositRead[]>("all:/api/fixed-deposits");
  const [filter, setFilter] = useState("All");
  const [editor, setEditor] = useState<FixedDepositRead | null | undefined>();
  const [deleting, setDeleting] = useState<FixedDepositRead>();
  const [principal, setPrincipal] = useState(100000);
  const [rate, setRate] = useState(7.25);
  const [years, setYears] = useState(3);
  const [frequency, setFrequency] = useState("Quarterly");
  const rows = query.data ?? [];
  const visible = rows.filter(
    (r) =>
      filter === "All" ||
      (r.maturity_date >= `${month}-01` &&
        r.maturity_date <=
          `${Number(month.slice(0, 4)) + 1}-${month.slice(5)}-01`),
  );
  const n = frequency === "Monthly" ? 12 : frequency === "Quarterly" ? 4 : 1;
  const estimate = calculateFD(principal, rate, years, n);
  const weighted =
    rows.reduce(
      (n, r) => n + decimal(r.principal) * decimal(r.interest_rate),
      0,
    ) / Math.max(decimal(total(rows.map((r) => r.principal))), 1);
  return (
    <div className="page-stack">
      <Card>
        <PageHeading
          title="Fixed Deposits"
          description="Deposit snapshots, estimated returns, and maturity milestones."
          actions={
            <>
              <Button
                icon="download"
                disabled={!query.data}
                onClick={() =>
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
                onClick={() => setEditor(null)}
              >
                Open New FD
              </Button>
            </>
          }
        />
      </Card>
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
            onChange={setFilter}
            items={["All", "Maturing Within 1 Year"]}
          />
        </div>
        <div className="deposit-grid">
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
                <Button onClick={() => setEditor(r)}>Details / Edit</Button>
                <button
                  className="icon-button"
                  aria-label={`Delete deposit ${r.id}`}
                  onClick={() => setDeleting(r)}
                >
                  <Icon name="delete" size={15} />
                </button>
              </div>
            </Card>
          ))}
        </div>
        {!visible.length && (
          <Card>
            <EmptyState text="No deposits match this selection." />
          </Card>
        )}
      </ApiBoundary>
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
            <Button variant="ghost" onClick={() => setEditor(null)}>
              Record at this rate →
            </Button>
          </div>
        </Card>
        <Card
          title="Maturity Milestones"
          subtitle="Scheduled estimated payouts"
        >
          <ApiBoundary query={query}>
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
      <Card title="Comparative Bank Fixed Deposit Rates">
        <EmptyState text="Bank rate comparisons and maturity instructions are not exposed by the current API." />
      </Card>
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
          onClose={() => setEditor(undefined)}
        />
      )}
      <ConfirmDelete
        key={deleting?.id ?? "none"}
        open={Boolean(deleting)}
        onClose={() => setDeleting(undefined)}
        onConfirm={async () => {
          if (deleting)
            await mutate(`/api/fixed-deposits/${deleting.id}`, "DELETE");
        }}
      />
    </div>
  );
}
