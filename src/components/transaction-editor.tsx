"use client";
import type { CategoryRead, TransactionRead } from "@/types/api";
import { useApi } from "@/lib/api-cache";
import { useFinance } from "./finance-provider";
import { ResourceEditor } from "./resource-editor";
import { ApiBoundary } from "./ui/api-boundary";
import { Modal } from "./ui/primitives";
export function TransactionEditor({
  open,
  onClose,
  transaction,
}: {
  open: boolean;
  onClose: () => void;
  transaction?: TransactionRead;
}) {
  const { month } = useFinance();
  const categories = useApi<CategoryRead[]>(
    open ? "all:/api/categories" : null,
  );
  if (!open) return null;
  if (!categories.data)
    return (
      <Modal
        open
        onClose={onClose}
        title={transaction ? "Edit Transaction" : "Quick Add Transaction"}
      >
        <ApiBoundary query={categories}>{null}</ApiBoundary>
      </Modal>
    );
  return (
    <ApiBoundary query={categories}>
      <ResourceEditor
        path="/api/transactions"
        record={transaction}
        title={transaction ? "Edit Transaction" : "Quick Add Transaction"}
        onClose={onClose}
        categories={categories.data}
        defaults={{
          transaction_type: "expense",
          transaction_date: `${month}-22`,
        }}
      />
    </ApiBoundary>
  );
}
