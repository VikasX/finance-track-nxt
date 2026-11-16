"use client";
import { useAmount } from "../use-amount";

import { useState } from "react";
import type {
  ContributionRead,
  PPFInterestRead,
  PPFRead,
  SavingsGoalRead,
} from "@/types/api";
import { mutate, useApi } from "@/lib/api-cache";
import { decimal, percent, total } from "@/lib/api-format";
import { dateLabel, downloadCSV } from "@/lib/finance";
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
  Modal,
  PageHeading,
  Progress,
} from "../ui/primitives";
import { DataTable, type Column } from "../ui/data-table";
import { Icon } from "../ui/icon";
export function Savings() {
  const amount = useAmount();
  const { month } = useFinance();
  const accounts = useApi<PPFRead[]>("all:/api/ppf");
  const goals = useApi<SavingsGoalRead[]>("all:/api/savings-goals");
  const [selected, setSelected] = useState("");
  const [accountEditor, setAccountEditor] = useState<
    PPFRead | null | undefined
  >();
  const [goalEditor, setGoalEditor] = useState<
    SavingsGoalRead | null | undefined
  >();
  const [contributionEditor, setContributionEditor] = useState<
    ContributionRead | null | undefined
  >();
  const [deleting, setDeleting] = useState<{ path: string; name: string }>();
  const [receipt, setReceipt] = useState(false);
  const [fy, setFY] = useState(
    Number(month.slice(0, 4)) - (Number(month.slice(5)) < 4 ? 1 : 0),
  );
  const account =
    accounts.data?.find((a) => String(a.id) === selected) ?? accounts.data?.[0];
  const contributions = useApi<ContributionRead[]>(
    account ? `/api/ppf/${account.id}/contributions` : null,
  );
  const interest = useApi<PPFInterestRead>(
    account ? `/api/ppf/${account.id}/interest?financial_year=${fy}` : null,
  );
  const fyRows = (contributions.data ?? []).filter(
    (c) =>
      c.contribution_date >= `${fy}-04-01` &&
      c.contribution_date <= `${fy + 1}-03-31`,
  );
  const deposited = total(fyRows.map((c) => c.amount));
  const cap = 150000;
  const room = cap - decimal(deposited);
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
            onClick={() => setContributionEditor(r)}
          >
            <Icon name="edit" size={15} />
          </button>
          <button
            className="icon-button"
            aria-label={`Delete contribution ${r.id}`}
            onClick={() =>
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
      <PageHeading
        title="PPF & Savings"
        eyebrow="Tax Sovereign Reserve"
        badge="API Connected"
        description="Reported PPF balances, contribution tracking, interest estimates, and savings goals"
        actions={
          <>
            <Button onClick={() => setAccountEditor(null)} icon="add">
              Add Account
            </Button>
            <Button
              disabled={!account}
              onClick={() => setReceipt(true)}
              icon="receipt_long"
            >
              Contribution Receipt
            </Button>
            <Button
              variant="primary"
              disabled={!account}
              icon="add_circle"
              onClick={() => setContributionEditor(null)}
            >
              Log Contribution
            </Button>
          </>
        }
      />
      <ApiBoundary query={accounts}>
        {account ? (
          <>
            <div className="filters">
              <label className="text-xs muted">
                PPF Account{" "}
                <select
                  aria-label="PPF account"
                  className="filter-select"
                  value={account.id}
                  onChange={(e) => setSelected(e.target.value)}
                >
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
                  onChange={(e) => setFY(Number(e.target.value))}
                >
                  {Array.from({ length: 8 }, (_, i) => 2020 + i).map((y) => (
                    <option key={y} value={y}>
                      FY {y}–{y + 1}
                    </option>
                  ))}
                </select>
              </label>
              <Button icon="edit" onClick={() => setAccountEditor(account)}>
                Edit Account
              </Button>
              <Button
                variant="danger"
                icon="delete"
                onClick={() =>
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
            <ApiBoundary query={contributions}>
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
        <Button icon="add" onClick={() => setGoalEditor(null)}>
          Create New Goal
        </Button>
      </div>
      <ApiBoundary query={goals}>
        <div className="goals-grid">
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
                <Button onClick={() => setGoalEditor(goal)}>
                  Configure Goal
                </Button>
                <button
                  className="icon-button"
                  aria-label={`Delete ${goal.name}`}
                  onClick={() =>
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
            onClick={() => setGoalEditor(null)}
          >
            <Icon name="add" size={26} />
            <h3>Create New Goal</h3>
            <p>Plan a target and update its saved balance.</p>
          </button>
        </div>
      </ApiBoundary>
      {account && (
        <>
          <ApiBoundary query={contributions}>
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
                      onClick={() =>
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
          <Card
            title="PPF Annual Interest Estimate"
            subtitle={`FY ${fy}–${fy + 1} · Monthly eligible balances`}
          >
            <ApiBoundary query={interest}>
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
          onClose={() => setAccountEditor(undefined)}
        />
      )}{" "}
      {goalEditor !== undefined && (
        <ResourceEditor
          path="/api/savings-goals"
          record={goalEditor ?? undefined}
          title={goalEditor ? "Configure Savings Goal" : "Create New Goal"}
          onClose={() => setGoalEditor(undefined)}
        />
      )}{" "}
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
          onClose={() => setContributionEditor(undefined)}
        />
      )}
      <ConfirmDelete
        key={deleting?.path ?? "none"}
        title={`Delete ${deleting?.name ?? "record"}?`}
        open={Boolean(deleting)}
        onClose={() => setDeleting(undefined)}
        onConfirm={async () => {
          if (deleting) await mutate(deleting.path, "DELETE");
        }}
      />
      <Modal
        open={receipt}
        title="PPF Contribution Receipt"
        onClose={() => setReceipt(false)}
      >
        <ApiBoundary query={contributions}>
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
            onClick={() =>
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
