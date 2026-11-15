"use client";
import { useState } from "react";
import type { ReactNode } from "react";
import { dateLabel, money } from "@/lib/finance";
import type { Transaction } from "@/types/finance";
import { useFinance } from "./finance-provider";
import { TransactionEditor } from "./transaction-editor";
import { DataTable, type Column } from "./ui/data-table";
import { Badge, ConfirmDelete } from "./ui/primitives";
import { Icon } from "./ui/icon";
export function TransactionTable({
  rows,
  toolbar,
  compact = false,
}: {
  rows: Transaction[];
  toolbar?: ReactNode;
  compact?: boolean;
}) {
  const { remove } = useFinance();
  const [editing, setEditing] = useState<Transaction>();
  const [deleting, setDeleting] = useState<string>();
  const columns: Column<Transaction>[] = [
    {
      key: "date",
      title: "Date & Time",
      sort: (t) => t.date,
      render: (t) => (
        <span className="whitespace-nowrap text-xs">
          {dateLabel(t.date)}
          <small className="block muted mt-1">09:15 AM</small>
        </span>
      ),
    },
    {
      key: "description",
      title: "Description / Entity",
      sort: (t) => t.name,
      render: (t) => (
        <div className="entity">
          <span className="entity-icon">
            <Icon
              name={
                t.kind === "income"
                  ? "corporate_fare"
                  : t.kind === "investment"
                    ? "trending_up"
                    : t.kind === "loan"
                      ? "home_work"
                      : t.category.includes("Food")
                        ? "shopping_cart"
                        : "receipt_long"
              }
            />
          </span>
          <div>
            <strong>{t.name}</strong>
            <small>{t.description}</small>
          </div>
        </div>
      ),
    },
    {
      key: "category",
      title: "Category",
      sort: (t) => t.category,
      render: (t) => (
        <Badge tone={t.kind === "income" ? "green" : "gray"}>
          {t.category}
        </Badge>
      ),
    },
    {
      key: "channel",
      title: "Payment Channel",
      sort: (t) => t.channel,
      render: (t) => (
        <span className="text-xs muted whitespace-nowrap">{t.channel}</span>
      ),
    },
    ...(!compact
      ? [
          {
            key: "kind",
            title: "Ledger Type",
            render: (t: Transaction) => (
              <Badge tone={t.kind === "income" ? "green" : "red"}>
                {t.kind === "income"
                  ? "CREDIT"
                  : t.kind === "expense"
                    ? "DEBIT"
                    : "TRANSFER"}
              </Badge>
            ),
          },
        ]
      : []),
    {
      key: "amount",
      title: "Amount (INR)",
      align: "right",
      sort: (t) => t.amount * (t.kind === "income" ? 1 : -1),
      render: (t) => (
        <strong
          className={`font-mono whitespace-nowrap ${t.kind === "income" ? "positive" : ""}`}
        >
          {t.kind === "income" ? "+" : "−"}
          {money(t.amount, "INR", 2)}
        </strong>
      ),
    },
    ...(!compact
      ? [
          {
            key: "actions",
            title: "Actions",
            render: (t: Transaction) => (
              <div className="flex">
                <button
                  className="icon-button"
                  aria-label={`Edit ${t.name}`}
                  onClick={() => setEditing(t)}
                >
                  <Icon name="edit" size={15} />
                </button>
                <button
                  className="icon-button"
                  aria-label={`Delete ${t.name}`}
                  onClick={() => setDeleting(t.id)}
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
        label="transactions"
        pageSize={compact ? 6 : 8}
        toolbar={toolbar}
      />
      {editing && (
        <TransactionEditor
          open
          transaction={editing}
          onClose={() => setEditing(undefined)}
        />
      )}
      <ConfirmDelete
        open={Boolean(deleting)}
        onClose={() => setDeleting(undefined)}
        onConfirm={() => {
          if (deleting) remove("transactions", deleting);
        }}
      />
    </>
  );
}
