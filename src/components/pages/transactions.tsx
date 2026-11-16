"use client";
import { useAmount } from "../use-amount";

import { useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type {
  CategoryRead,
  PageResult,
  SummaryRead as ReportSummaryRead,
  TransactionRead,
} from "@/types/api";
import { apiPath } from "@/lib/api-client";
import { mutate, useApi, useDebounced } from "@/lib/api-cache";
import { monthRange, percent } from "@/lib/api-format";
import { parseCSV } from "@/lib/csv";
import { useFinance } from "../finance-provider";
import { ApiBoundary } from "../ui/api-boundary";
import {
  Badge,
  Button,
  Card,
  Metric,
  PageHeading,
  Tabs,
} from "../ui/primitives";
import { Icon } from "../ui/icon";
import { TransactionTable } from "../transaction-table";
import { TransactionEditor } from "../transaction-editor";
import { ConfirmDelete } from "../ui/primitives";
export function Transactions() {
  const params = useSearchParams();
  return (
    <TransactionsView
      key={params.get("q") ?? ""}
      initialSearch={params.get("q") ?? ""}
    />
  );
}
function TransactionsView({ initialSearch }: { initialSearch: string }) {
  const amount = useAmount();
  const { month, setTransactionOpen, notify } = useFinance();
  const [search, setSearch] = useState(initialSearch);
  const [kind, setKind] = useState("All");
  const [category, setCategory] = useState("");
  const [channel, setChannel] = useState("");
  const [date, setDate] = useState("");
  const [editing, setEditing] = useState<TransactionRead>();
  const [deleting, setDeleting] = useState<TransactionRead>();
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(8);
  const [importError, setImportError] = useState("");
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const settled = useDebounced(search);
  const range = monthRange(month);
  const categories = useApi<CategoryRead[]>("all:/api/categories");
  const list = useApi<PageResult<TransactionRead>>(
    apiPath("/api/transactions", {
      ...range,
      search: settled,
      transaction_type: kind === "All" ? undefined : kind.toLowerCase(),
      category_id: category,
      payment_method: channel,
      date_from: date || range.date_from,
      date_to: date || range.date_to,
      page,
      page_size: size,
    }),
  );
  const summary = useApi<ReportSummaryRead>(
    apiPath("/api/reports/summary", range),
  );
  if (
    list.data &&
    list.data.page > 1 &&
    list.data.total <= (list.data.page - 1) * size
  )
    setPage(Math.max(1, Math.ceil(list.data.total / size)));
  async function importCSV(file?: File) {
    if (!file || importing) return;
    setImporting(true);
    setImportError("");
    let completed = 0;
    try {
      const rows = parseCSV(await file.text());
      const headers = rows.shift()?.map((h) => h.trim().toLowerCase()) ?? [];
      if (
        ![
          "description",
          "amount",
          "transaction_date",
          "transaction_type",
        ].every((h) => headers.includes(h))
      )
        throw new Error(
          "CSV headers must include description,amount,transaction_date,transaction_type. Optional: category_id,payment_method,reference_code,notes.",
        );
      const records = rows.map((cells) => {
        const record: Record<string, string | number | null> = {};
        headers.forEach((h, i) => {
          if (
            [
              "description",
              "amount",
              "transaction_date",
              "transaction_type",
              "category_id",
              "payment_method",
              "reference_code",
              "notes",
            ].includes(h) &&
            cells[i]?.trim()
          )
            record[h] =
              h === "category_id" ? Number(cells[i]) : cells[i].trim();
        });
        if (
          !record.description ||
          !/^\d+(\.\d+)?$/.test(String(record.amount)) ||
          Number(record.amount) <= 0
        )
          throw new Error(
            "Each CSV row needs a description and a positive decimal amount.",
          );
        return record;
      });
      for (const record of records) {
        await mutate("/api/transactions", "POST", record);
        completed++;
      }
      notify(`Imported ${completed} transactions.`);
    } catch (error) {
      setImportError(
        `${error instanceof Error ? error.message : "Import failed."}${completed ? ` ${completed} rows were already saved; remove them from the file before retrying.` : ""}`,
      );
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }
  const change = (fn: () => void) => {
    fn();
    setPage(1);
  };
  return (
    <div className="page-stack">
      <PageHeading
        title="Income & Expenses"
        eyebrow="Telemetry / Cash Flow"
        badge="API Connected"
        description="Comprehensive cash flow ledger, categorization, and transaction management"
        actions={
          <>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => void importCSV(e.target.files?.[0])}
            />
            <Button
              icon="file_upload"
              disabled={importing}
              onClick={() => fileRef.current?.click()}
            >
              {importing ? "Importing…" : "Import CSV"}
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
      {importError && (
        <div role="alert" className="card api-error">
          {importError}
          <Button onClick={() => setImportError("")}>Dismiss</Button>
        </div>
      )}
      <ApiBoundary query={summary}>
        {summary.data && (
          <div className="metric-grid transactions-metrics">
            <Metric
              label="Total Inflow"
              value={amount(summary.data.totals.income)}
              icon="south_west"
              detail={<Badge tone="green">Recorded income credits</Badge>}
            />
            <Metric
              label="Total Expenses"
              value={amount(summary.data.totals.expenses)}
              icon="north_east"
              detail="Operating expenses · excludes investments and loan payments"
            />
            <Metric
              label="Net Cash Flow"
              value={amount(summary.data.totals.net_cash_flow)}
              icon="account_balance_wallet"
              detail={`${percent(summary.data.totals.savings_rate_percent)} savings rate`}
              footer={`Total outflow: ${amount(summary.data.totals.total_outflow)}`}
            />
          </div>
        )}
      </ApiBoundary>
      <Card className="!p-4">
        <div className="filters">
          <label className="search-input flex-1">
            <Icon name="search" size={16} />
            <input
              aria-label="Search ledger"
              placeholder="Search description, notes, reference..."
              value={search}
              onChange={(e) => change(() => setSearch(e.target.value))}
            />
          </label>
          <Tabs
            value={kind}
            onChange={(v) => change(() => setKind(v))}
            items={[
              "All",
              "Income",
              "Expense",
              "Investment",
              "Loan_payment",
              "Transfer",
            ]}
          />
          <select
            aria-label="Filter category"
            className="filter-select"
            value={category}
            onChange={(e) => change(() => setCategory(e.target.value))}
          >
            <option value="">All Categories</option>
            {categories.data?.map((c) => (
              <option value={c.id} key={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            aria-label="Filter payment channel"
            className="filter-select"
            placeholder="Payment channel"
            value={channel}
            onChange={(e) => change(() => setChannel(e.target.value))}
          />
          <input
            aria-label="Filter exact date"
            className="filter-select"
            type="date"
            value={date}
            onChange={(e) => change(() => setDate(e.target.value))}
          />
          <Button
            variant="ghost"
            onClick={() =>
              change(() => {
                setSearch("");
                setKind("All");
                setCategory("");
                setChannel("");
                setDate("");
              })
            }
          >
            Clear
          </Button>
        </div>
        {categories.error && (
          <p role="alert" className="api-error">
            Categories could not load.{" "}
            <button onClick={categories.retry}>Retry</button>
          </p>
        )}
      </Card>
      <ApiBoundary query={list}>
        {list.data && (
          <TransactionTable
            onEdit={setEditing}
            onDelete={setDeleting}
            rows={list.data.items}
            categories={categories.data}
            pagination={{
              page: list.data.page,
              pageSize: list.data.page_size,
              total: list.data.total,
              onChange: (page, size) => {
                setPage(page);
                setSize(size);
              },
            }}
          />
        )}
      </ApiBoundary>
      {editing && (
        <TransactionEditor
          open
          transaction={editing}
          onClose={() => setEditing(undefined)}
        />
      )}
      <ConfirmDelete
        key={deleting?.id ?? "none"}
        open={Boolean(deleting)}
        onClose={() => setDeleting(undefined)}
        onConfirm={async () => {
          if (deleting)
            await mutate(`/api/transactions/${deleting.id}`, "DELETE");
        }}
      />
      <div className="info-strip">
        <Icon name="info" />
        Search, dates, categories, and payment channels filter the server
        ledger. Column sorting applies to the current page.
      </div>
    </div>
  );
}
