/*
 * src/components/pages/transactions.tsx
 * Loads the server-paginated transaction ledger plus monthly summary cards. Filters change the request URL; dialogs stay outside the loading boundary so a search refresh cannot close an edit in progress.
 * "use client" marks the browser-interactive entry point: hooks/events or browser APIs
 * need JavaScript after hydration. Next may still prerender its initial HTML on the server.
 * Beginner syntax: @/ means src/ (tsconfig paths); import type is compile-time only.
 */
"use client";
// Use the shared settings-aware amount formatter so saved number formatting applies consistently to this screen.
import { useAmount } from "../use-amount";

// Import React hooks for local state/lifecycle/subscriptions and React types where needed. Hooks run at the component top level; type-only names disappear from the browser JavaScript.
import { useRef, useState } from "react";
// Use App Router navigation helpers to read the active URL or redirect. URL state is separate from local useState values.
import { useSearchParams } from "next/navigation";
// Import generated response types from openapi.json. These describe API field shapes to TypeScript; they do not fetch data or validate server JSON at runtime.
import type {
  CategoryRead,
  PageResult,
  SummaryRead as ReportSummaryRead,
  TransactionRead,
} from "@/types/api";
// Reuse URL, HTTP, or error helpers instead of duplicating fetch/parsing rules in this file. Browser /api paths are forwarded by the Next proxy.
import { apiPath } from "@/lib/api-client";
// Reuse the shared read cache/write flow. useApi supplies reactive request state; successful mutate calls invalidate cached data so subscribed screens refresh.
import { mutate, useApi, useDebounced } from "@/lib/api-cache";
// Reuse decimal/date adapters. Money remains a string at the API boundary; exact totals and display/chart conversion have separate responsibilities.
import { monthRange, percent } from "@/lib/api-format";
// Use the quoted-CSV parser; the transaction importer separately validates writable columns before POSTing records.
import { parseCSV } from "@/lib/csv";
// Read shared UI context for the selected month, global transaction dialog, or toast messages. Financial records still come from API hooks.
import { useFinance } from "../finance-provider";
// Use the common loading/error/retry wrapper, keeping request failure visibly different from an empty successful response.
import { ApiBoundary } from "../ui/api-boundary";
// Import the shared styled UI pieces rather than repeating button/card/dialog/form markup. Their props let this screen supply content and event callbacks.
import {
  Badge,
  Button,
  Card,
  Metric,
  PageHeading,
  Tabs,
} from "../ui/primitives";
// Resolve existing design icon names through the shared Lucide mapping, keeping icon rendering consistent.
import { Icon } from "../ui/icon";
// Reuse ledger column rendering and edit/delete actions; this caller supplies the records, categories, and any server pagination.
import { TransactionTable } from "../transaction-table";
// Reuse the category-aware transaction form wrapper for creation/editing rather than rebuilding request fields here.
import { TransactionEditor } from "../transaction-editor";
// Import the shared styled UI pieces rather than repeating button/card/dialog/form markup. Their props let this screen supply content and event callbacks.
import { ConfirmDelete } from "../ui/primitives";
// Read q from the URL for global-search navigation. The key remounts TransactionsView when q changes, giving its local search state the new starting text.
export function Transactions() {
  const params = useSearchParams();
  return (
    <TransactionsView
      key={params.get("q") ?? ""}
      initialSearch={params.get("q") ?? ""}
    />
  );
}
// Own ledger filters, server page selection, import status, and the selected edit/delete record. initialSearch initializes state once; subsequent typing stays local until the debounce updates the API key.
function TransactionsView({ initialSearch }: { initialSearch: string }) {
  // Get the shared currency formatter; its settings read is deduplicated by the API cache.
  const amount = useAmount();
  // Destructure shared UI values and setters from FinanceProvider. Object braces select named properties; they do not create independent copies of the underlying state.
  const { month, setTransactionOpen, notify } = useFinance();
  // React state stores the input text immediately, before its debounced value triggers a server search. The setter (second array value) schedules a rerender when a control/event changes it; ordinary local variables would reset on each render.
  const [search, setSearch] = useState(initialSearch);
  // React state stores the selected transaction nature/tab; changing it updates filters or allowed category choices. The setter (second array value) schedules a rerender when a control/event changes it; ordinary local variables would reset on each render.
  const [kind, setKind] = useState("All");
  // React state stores the chosen category filter or editable category record, depending on this screen. The setter (second array value) schedules a rerender when a control/event changes it; ordinary local variables would reset on each render.
  const [category, setCategory] = useState("");
  // React state stores the ledger payment-method filter. The setter (second array value) schedules a rerender when a control/event changes it; ordinary local variables would reset on each render.
  const [channel, setChannel] = useState("");
  // React state stores an optional exact ledger date that overrides the month interval. The setter (second array value) schedules a rerender when a control/event changes it; ordinary local variables would reset on each render.
  const [date, setDate] = useState("");
  // Keep the chosen transaction outside the loading boundary so a refreshed table cannot unmount its edit dialog.
  const [editing, setEditing] = useState<TransactionRead>();
  // Remember the record chosen for deletion so the confirmation dialog can target it. Clearing the selection closes the dialog.
  const [deleting, setDeleting] = useState<TransactionRead>();
  // React state stores the requested server page number (starting at one). The setter (second array value) schedules a rerender when a control/event changes it; ordinary local variables would reset on each render.
  const [page, setPage] = useState(1);
  // React state stores how many ledger rows the server should return per page. The setter (second array value) schedules a rerender when a control/event changes it; ordinary local variables would reset on each render.
  const [size, setSize] = useState(8);
  // React state stores an import failure message, including how many rows were saved before failure. The setter (second array value) schedules a rerender when a control/event changes it; ordinary local variables would reset on each render.
  const [importError, setImportError] = useState("");
  // React state stores whether a CSV import is running, preventing overlapping imports. The setter (second array value) schedules a rerender when a control/event changes it; ordinary local variables would reset on each render.
  const [importing, setImporting] = useState(false);
  // A ref points to the real hidden file input so the visible Import button can open it and the importer can clear it afterward.
  const fileRef = useRef<HTMLInputElement>(null);
  // Debounce the search text before using it in the URL, reducing requests while the user is still typing.
  const settled = useDebounced(search);
  // Prepare the selected date interval or period used by this screen; the API query consumes the corresponding date fields.
  const range = monthRange(month);
  // Subscribe categories to this API key. The type inside <...> describes the returned data; loading/error/retry travel with it. A changed URL selects a new cached request, and null skips the read.
  const categories = useApi<CategoryRead[]>("all:/api/categories");
  // Subscribe list to this API key. The type inside <...> describes the returned data; loading/error/retry travel with it. A changed URL selects a new cached request, and null skips the read.
  const list = useApi<PageResult<TransactionRead>>(
    // Pass actual server filters, not only visual filtering of eight rows. items holds this page; total counts every server row matching these parameters.
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
  // Subscribe summary to this API key. The type inside <...> describes the returned data; loading/error/retry travel with it. A changed URL selects a new cached request, and null skips the read.
  const summary = useApi<ReportSummaryRead>(
    apiPath("/api/reports/summary", range),
  );
  // After deleting the last record on a later page, move to the final remaining page. The guard becomes false on the next render, avoiding a repeated update loop.
  if (
    list.data &&
    list.data.page > 1 &&
    list.data.total <= (list.data.page - 1) * size
  )
    setPage(Math.max(1, Math.ceil(list.data.total / size)));
  // Read and validate the selected file, keep only writable columns, then POST rows one by one. Track completed writes because a partial failure cannot roll back rows already saved by the backend.
  async function importCSV(file?: File) {
    if (!file || importing) return;
    setImporting(true);
    setImportError("");
    let completed = 0;
    try {
      // Parse the selected local file into rows of strings before building request bodies.
      // These are unsaved CSV cells, not downloaded transaction records.
      const rows = parseCSV(await file.text());
      // Prepare headers by transforming each source item. map returns a new array; the response records remain available in their original shape.
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
      // Prepare records by transforming each source item. map returns a new array; the response records remain available in their original shape.
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
      // Save sequentially because the API has no bulk import transaction. completed records cannot be undone automatically if a later POST fails.
      for (const record of records) {
        await mutate("/api/transactions", "POST", record);
        completed++;
      }
      notify(`Imported ${completed} transactions.`);
    } catch (error) {
      setImportError(
        `${error instanceof Error ? error.message : "Import failed."}${completed ? ` ${completed} rows were already saved; remove them from the file before retrying.` : ""}`,
      );
    // Always release the import guard and reset the input. Clearing its value lets the same corrected file be selected again after a failure.
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }
  // Apply a filter change and reset pagination to page one. A previously valid page number may not exist in the smaller filtered result.
  const change = (fn: () => void) => {
    fn();
    setPage(1);
  };
  return (
    <div className="page-stack">
      {/* Page title and primary actions share the same layout classes; callbacks below change state or start an operation when clicked. */}
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
              {/* Choose one of two UI branches with condition ? trueBranch : falseBranch. This keeps selected/empty/alternate states in the same layout position. */}
              {importing ? "Importing…" : "Import CSV"}
            </Button>
            <Button
              variant="primary"
              icon="add"
              onClick={
                // Toggle the shared transaction dialog through FinanceProvider. The existing form is reused across the header and page action.
                () => setTransactionOpen(true)
              }
            >
              Add Transaction
            </Button>
          </>
        }
      />
      {/* Conditional JSX: render the following block only when the left-hand condition is truthy; otherwise React leaves it out. */}
      {importError && (
        <div role="alert" className="card api-error">
          {importError}
          <Button onClick={
            // Dismiss the current import error text without pretending previously failed rows were saved.
            () => setImportError("")
          }>Dismiss</Button>
        </div>
      )}
      {/* Request state belongs here: show initial loading or an error with Retry before treating the following content as successful data. */}
      <ApiBoundary query={summary}>
        {/* Conditional JSX: render the following block only when the left-hand condition is truthy; otherwise React leaves it out. */}
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
              onChange={
                // Update the visible search input immediately. The debounced value later changes the request key so typing does not create one request per keystroke.
                (e) => change(() => setSearch(e.target.value))
              }
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
            onChange={
              // Update the chosen category. Ledger filters also reset page one via change(); the dashboard filters its already-returned recent rows locally.
              (e) => change(() => setCategory(e.target.value))
            }
          >
            <option value="">All Categories</option>
            {/* Turn matching items into JSX with map. Each repeated element needs a stable key so React preserves the right row/control when data changes. */}
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
            onChange={
              // Store the payment-method input. change() resets page one and the next request key applies the server payment_method filter.
              (e) => change(() => setChannel(e.target.value))
            }
          />
          <input
            aria-label="Filter exact date"
            className="filter-select"
            type="date"
            value={date}
            onChange={
              // Store the exact date filter. A nonempty date replaces both ends of the month interval; clearing restores the month range.
              (e) => change(() => setDate(e.target.value))
            }
          />
          <Button
            variant="ghost"
            onClick={
              // Update the visible search input immediately. The debounced value later changes the request key so typing does not create one request per keystroke.
              () =>
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
        {/* Conditional JSX: render the following block only when the left-hand condition is truthy; otherwise React leaves it out. */}
        {categories.error && (
          <p role="alert" className="api-error">
            Categories could not load.{" "}
            <button onClick={categories.retry}>Retry</button>
          </p>
        )}
      </Card>
      {/* Request state belongs here: show initial loading or an error with Retry before treating the following content as successful data. */}
      <ApiBoundary query={list}>
        {/* Conditional JSX: render the following block only when the left-hand condition is truthy; otherwise React leaves it out. */}
        {list.data && (
          <TransactionTable
            onEdit={
              // Select the existing transaction or clear edit state; keeping this state in the parent protects the dialog during table refreshes.
              setEditing
            }
            onDelete={
              // Remember the selected record for a confirmation dialog, or clear it on close. Selecting it alone does not send DELETE.
              setDeleting
            }
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
      {/* Conditional JSX: render the following block only when the left-hand condition is truthy; otherwise React leaves it out. */}
      {editing && (
        <TransactionEditor
          open
          transaction={editing}
          onClose={
            // Select the existing transaction or clear edit state; keeping this state in the parent protects the dialog during table refreshes.
            () => setEditing(undefined)
          }
        />
      )}
      {/* Keep destructive writes behind confirmation. The callback awaits DELETE; failures stay in the dialog and a successful 204 has no JSON body. */}
      <ConfirmDelete
        key={deleting?.id ?? "none"}
        open={Boolean(deleting)}
        onClose={
          // Remember the selected record for a confirmation dialog, or clear it on close. Selecting it alone does not send DELETE.
          () => setDeleting(undefined)
        }
        onConfirm={
          // This callback performs a backend write through mutate. Await success before closing/notifying; the shared cache then refreshes active reads, and failures propagate to the visible error handler.
          async () => {
            if (deleting)
              await mutate(`/api/transactions/${deleting.id}`, "DELETE");
          }
        }
      />
      <div className="info-strip">
        <Icon name="info" />
        Search, dates, categories, and payment channels filter the server
        ledger. Column sorting applies to the current page.
      </div>
    </div>
  );
}
