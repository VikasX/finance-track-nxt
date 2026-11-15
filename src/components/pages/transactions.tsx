"use client";
import { useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useFinance } from "../finance-provider";
import { selectSummary } from "@/lib/selectors";
import {
  Badge,
  Button,
  Card,
  Metric,
  PageHeading,
  Tabs,
} from "../ui/primitives";
import { TransactionTable } from "../transaction-table";
import { Icon } from "../ui/icon";
import { money, uid } from "@/lib/finance";
import { parseCSV } from "@/lib/csv";
import type { Transaction, TransactionKind } from "@/types/finance";
export function Transactions() {
  const params = useSearchParams();
  const initialSearch = params.get("q") ?? "";
  return <TransactionsView key={initialSearch} initialSearch={initialSearch} />;
}
function TransactionsView({ initialSearch }: { initialSearch: string }) {
  const { state, month, update, notify, setTransactionOpen } = useFinance();
  const [search, setSearch] = useState(initialSearch);
  const [kind, setKind] = useState("All");
  const [category, setCategory] = useState("All Categories");
  const [channel, setChannel] = useState("All Payment Channels");
  const [date, setDate] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const summary = selectSummary(state, month);
  const rows = [...summary.transactions]
    .filter(
      (t) =>
        `${t.name} ${t.description} ${t.category}`
          .toLowerCase()
          .includes(search.toLowerCase()) &&
        (kind === "All" ||
          (kind === "Income" ? t.kind === "income" : t.kind !== "income")) &&
        (category === "All Categories" || t.category === category) &&
        (channel === "All Payment Channels" || t.channel === channel) &&
        (!date || t.date === date),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  async function importCSV(file?: File) {
    if (!file) return;
    try {
      const text = await file.text();
      const lines = parseCSV(text);
      const headers = lines
        .shift()
        ?.map((header) => header.trim().toLowerCase());
      if (
        !headers ||
        !["name", "amount", "date", "kind", "category", "channel"].every(
          (key) => headers.includes(key),
        )
      )
        throw new Error(
          "Use CSV headers: name,amount,date,kind,category,channel",
        );
      const added: Transaction[] = lines.map((cells) => {
        const read = (key: string) => cells[headers.indexOf(key)]?.trim() ?? "";
        const amount = Number(read("amount"));
        const kind = read("kind") as TransactionKind;
        if (
          !Number.isFinite(amount) ||
          amount <= 0 ||
          !/^\d{4}-\d{2}-\d{2}$/.test(read("date")) ||
          !Number.isFinite(Date.parse(read("date"))) ||
          !["income", "expense", "investment", "loan"].includes(kind)
        )
          throw new Error("Invalid CSV amount, date, or transaction kind.");
        return {
          id: uid(),
          name: read("name"),
          amount,
          date: read("date"),
          kind,
          category: read("category"),
          channel: read("channel"),
          description: "Imported from CSV",
        };
      });
      update((current) => ({
        ...current,
        transactions: [...current.transactions, ...added],
        categories: Array.from(
          new Set([...current.categories, ...added.map((t) => t.category)]),
        ),
      }));
      notify(`Imported ${added.length} transactions.`);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to import CSV.");
    }
    if (fileRef.current) fileRef.current.value = "";
  }
  return (
    <div className="page-stack">
      <PageHeading
        title="Income & Expenses"
        eyebrow="Telemetry / Cash Flow"
        badge="Demo ledger"
        description="Comprehensive cash flow ledger, categorization, and transaction management"
        actions={
          <>
            <input
              className="hidden"
              ref={fileRef}
              type="file"
              accept=".csv"
              onChange={(e) => importCSV(e.target.files?.[0])}
            />
            <Button icon="file_upload" onClick={() => fileRef.current?.click()}>
              Import CSV
            </Button>
            <Button
              variant="primary"
              icon="add"
              onClick={() => setTransactionOpen(true)}
            >
              Add Transaction
            </Button>
          </>
        }
      />
      <div className="metric-grid transactions-metrics">
        <Metric
          label="Total Inflow"
          value={money(summary.income)}
          icon="south_west"
          detail={<Badge tone="green">Verified income credits</Badge>}
        />
        <Metric
          label="Total Outflow"
          value={money(summary.expense)}
          icon="north_east"
          detail={`${summary.income ? ((summary.expense / summary.income) * 100).toFixed(1) : 0}% burn of monthly income`}
        />
        <Metric
          label="Net Cash Flow"
          value={`+${money(summary.net)}`}
          icon="account_balance_wallet"
          detail={
            <>
              <Badge tone="green">Surplus</Badge>
              {summary.savingsRate.toFixed(1)}% retained wealth
            </>
          }
        />
      </div>
      <Card className="!p-4">
        <div className="filters">
          <label className="search-input flex-1">
            <Icon name="search" size={16} />
            <input
              aria-label="Search ledger"
              placeholder="Search descriptions, entities, categories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <Tabs
            items={["All", "Income", "Expense"]}
            value={kind}
            onChange={setKind}
          />
          <select
            aria-label="Filter category"
            className="filter-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option>All Categories</option>
            {state.categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select
            aria-label="Filter payment channel"
            className="filter-select"
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
          >
            <option>All Payment Channels</option>
            {Array.from(new Set(state.transactions.map((t) => t.channel))).map(
              (c) => (
                <option key={c}>{c}</option>
              ),
            )}
          </select>
          <input
            aria-label="Filter exact date"
            className="filter-select"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          {(date ||
            search ||
            category !== "All Categories" ||
            channel !== "All Payment Channels" ||
            kind !== "All") && (
            <Button
              variant="ghost"
              onClick={() => {
                setDate("");
                setSearch("");
                setCategory("All Categories");
                setChannel("All Payment Channels");
                setKind("All");
              }}
            >
              Clear
            </Button>
          )}
        </div>
      </Card>
      <TransactionTable
        key={`${search}-${category}-${channel}-${kind}-${date}`}
        rows={rows}
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {[
          {
            icon: "verified",
            title: "Auto-Categorization",
            value: `${summary.transactions.length} tagged entries`,
            text: "Your transactions are grouped into consistent spending envelopes.",
          },
          {
            icon: "savings",
            title: `Savings Rate: ${summary.savingsRate >= 50 ? "Target Met" : "Review Needed"}`,
            value: money(summary.net),
            text: "Operational surplus excludes investment and loan transfers.",
          },
          {
            icon: "account_balance",
            title: "HDFC Direct Feed",
            value: "Demo data",
            text: "Changes are stored in this browser. No bank connection is active.",
          },
        ].map((item) => (
          <Card key={item.title} className="flex gap-3 !p-5">
            <span className="entity-icon">
              <Icon name={item.icon} />
            </span>
            <div>
              <h3 className="!text-xs">{item.title}</h3>
              <strong className="text-xs positive">{item.value}</strong>
              <p className="muted text-[10px] mt-1">{item.text}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
