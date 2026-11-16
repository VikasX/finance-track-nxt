"use client";
import { useState, type ReactNode } from "react";
import type { CategoryRead, TransactionRead } from "@/types/api";
import { mutate } from "@/lib/api-cache";
import { useAmount } from "./use-amount";
import { dateLabel } from "@/lib/finance";
import { TransactionEditor } from "./transaction-editor";
import { DataTable, type Column } from "./ui/data-table";
import { Badge, ConfirmDelete } from "./ui/primitives";
import { Icon } from "./ui/icon";
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
  const amount = useAmount();
  const [editing, setEditing] = useState<TransactionRead>();
  const [deleting, setDeleting] = useState<TransactionRead>();
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
                  onClick={() => (onEdit ? onEdit(r) : setEditing(r))}
                >
                  <Icon name="edit" size={15} />
                </button>
                <button
                  className="icon-button"
                  aria-label={`Delete ${r.description}`}
                  onClick={() => (onDelete ? onDelete(r) : setDeleting(r))}
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
      <DataTable
        rows={rows}
        columns={columns}
        toolbar={toolbar}
        pageSize={compact ? 6 : 8}
        label="transactions"
        pagination={pagination}
      />
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
    </>
  );
}
