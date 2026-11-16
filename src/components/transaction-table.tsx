/*
 * src/components/transaction-table.tsx
 * Defines transaction columns and edit/delete actions on top of DataTable. Screens supply API records and optional pagination/action callbacks; this component does not invent transactions.
 * "use client" marks the browser-interactive entry point: hooks/events or browser APIs
 * need JavaScript after hydration. Next may still prerender its initial HTML on the server.
 * Beginner syntax: @/ means src/ (tsconfig paths); import type is compile-time only.
 */
"use client";
// Import React hooks for local state/lifecycle/subscriptions and React types where needed. Hooks run at the component top level; type-only names disappear from the browser JavaScript.
import { useState, type ReactNode } from "react";
// Import generated response types from openapi.json. These describe API field shapes to TypeScript; they do not fetch data or validate server JSON at runtime.
import type { CategoryRead, TransactionRead } from "@/types/api";
// Reuse the shared read cache/write flow. useApi supplies reactive request state; successful mutate calls invalidate cached data so subscribed screens refresh.
import { mutate } from "@/lib/api-cache";
// Use the shared settings-aware amount formatter so saved number formatting applies consistently to this screen.
import { useAmount } from "./use-amount";
// Reuse formatting, local calculator, or download helpers. These utilities do not perform backend writes.
import { dateLabel } from "@/lib/finance";
// Reuse the category-aware transaction form wrapper for creation/editing rather than rebuilding request fields here.
import { TransactionEditor } from "./transaction-editor";
// Use a shared table plus typed column definitions; this file supplies rows/cell renderers while the table handles sorting and pagination controls.
import { DataTable, type Column } from "./ui/data-table";
// Import the shared styled UI pieces rather than repeating button/card/dialog/form markup. Their props let this screen supply content and event callbacks.
import { Badge, ConfirmDelete } from "./ui/primitives";
// Resolve existing design icon names through the shared Lucide mapping, keeping icon rendering consistent.
import { Icon } from "./ui/icon";
// Build typed columns and route edit/delete actions either to parent callbacks or local dialogs. compact changes the presentation, not the underlying API records.
export function TransactionTable({
  rows,
  categories = [],
  toolbar,
  compact = false,
  pagination,
  onEdit,
  onDelete,
}: {
  rows: TransactionRead[];
  categories?: CategoryRead[];
  toolbar?: ReactNode;
  compact?: boolean;
  onEdit?: (transaction: TransactionRead) => void;
  onDelete?: (transaction: TransactionRead) => void;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onChange: (page: number, size: number) => void;
  };
}) {
  // Get the shared currency formatter; its settings read is deduplicated by the API cache.
  const amount = useAmount();
  // Keep the chosen transaction outside the loading boundary so a refreshed table cannot unmount its edit dialog.
  const [editing, setEditing] = useState<TransactionRead>();
  // Remember the record chosen for deletion so the confirmation dialog can target it. Clearing the selection closes the dialog.
  const [deleting, setDeleting] = useState<TransactionRead>();
  // Describe each table cell with a stable key, label, optional sort selector, and render callback. DataTable handles repeated row markup.
  const columns: Column<TransactionRead>[] = [
    {
      key: "date",
      title: "Date & Time",
      sort: (r) => r.transaction_date,
      render: (r) => (
        <span className="whitespace-nowrap text-xs">
          {dateLabel(r.transaction_date)}
        </span>
      ),
    },
    {
      key: "entity",
      title: "Description / Entity",
      sort: (r) => r.description,
      render: (r) => (
        <div className="entity">
          <span className="entity-icon">
            <Icon
              name={
                r.transaction_type === "income"
                  ? "corporate_fare"
                  : r.transaction_type === "investment"
                    ? "trending_up"
                    : "receipt_long"
              }
            />
          </span>
          <div>
            <strong>{r.description}</strong>
            <small>{r.notes ?? r.reference_code ?? ""}</small>
          </div>
        </div>
      ),
    },
    {
      key: "category",
      title: "Category",
      render: (r) => (
        <Badge tone={r.transaction_type === "income" ? "green" : "gray"}>
          {categories.find((c) => c.id === r.category_id)?.name ??
            (r.category_id == null
              ? "Uncategorized"
              : `Category ${r.category_id}`)}
        </Badge>
      ),
    },
    {
      key: "payment",
      title: "Payment Channel",
      sort: (r) => r.payment_method ?? "",
      render: (r) => (
        <span className="muted whitespace-nowrap">
          {r.payment_method ?? "—"}
        </span>
      ),
    },
    {
      key: "kind",
      title: "Ledger Type",
      render: (r) => (
        <Badge
          tone={
            r.transaction_type === "income"
              ? "green"
              : r.transaction_type === "expense"
                ? "red"
                : "gray"
          }
        >
          {r.transaction_type.replaceAll("_", " ")}
        </Badge>
      ),
    },
    {
      key: "amount",
      title: "Amount (INR)",
      align: "right",
      sort: (r) => Number(r.amount),
      render: (r) => (
        <strong
          className={`font-mono whitespace-nowrap ${r.transaction_type === "income" ? "positive" : ""}`}
        >
          {/* Choose one of two UI branches with condition ? trueBranch : falseBranch. This keeps selected/empty/alternate states in the same layout position. */}
          {r.transaction_type === "income" ? "+" : "−"}
          {amount(r.amount, "INR", 2)}
        </strong>
      ),
    },
    ...(!compact
      ? [
          {
            key: "actions",
            title: "Actions",
            render: (r: TransactionRead) => (
              <div className="flex">
                <button
                  className="icon-button"
                  aria-label={`Edit ${r.description}`}
                  onClick={
                    // Select the existing transaction or clear edit state; keeping this state in the parent protects the dialog during table refreshes.
                    () => (onEdit ? onEdit(r) : setEditing(r))
                  }
                >
                  <Icon name="edit" size={15} />
                </button>
                <button
                  className="icon-button"
                  aria-label={`Delete ${r.description}`}
                  onClick={
                    // Remember the selected record for a confirmation dialog, or clear it on close. Selecting it alone does not send DELETE.
                    () => (onDelete ? onDelete(r) : setDeleting(r))
                  }
                >
                  <Icon name="delete" size={15} />
                </button>
              </div>
            ),
          },
        ]
      : []),
  ];
  return (
    <>
      {/* Pass rows and display/interaction instructions to the shared table. Stable record IDs identify rows; server pagination must use the backend total, not items.length. */}
      <DataTable
        rows={rows}
        columns={columns}
        toolbar={toolbar}
        pageSize={compact ? 6 : 8}
        label="transactions"
        pagination={pagination}
      />
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
    </>
  );
}
