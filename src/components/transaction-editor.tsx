"use client";
import { useState } from "react";
import { useFinance } from "./finance-provider";
import { Modal, RecordForm, Tabs, type FormField } from "./ui/primitives";
import type { Transaction, TransactionKind } from "@/types/finance";
import { uid } from "@/lib/finance";
export function TransactionEditor({
  open,
  onClose,
  transaction,
}: {
  open: boolean;
  onClose: () => void;
  transaction?: Transaction;
}) {
  const { state, update, notify, month } = useFinance();
  const [kind, setKind] = useState<TransactionKind>(
    transaction?.kind ?? "expense",
  );
  const fields: FormField[] = [
    {
      name: "amount",
      label: "Amount (₹)",
      type: "number",
      min: 0.01,
      value: transaction?.amount,
      placeholder: "0.00",
    },
    {
      name: "category",
      label: "Category",
      type: "select",
      options: state.categories,
      value:
        transaction?.category ??
        (kind === "income" ? "Salary" : "Food & Dining"),
    },
    {
      name: "channel",
      label: "Account / Payment Channel",
      type: "select",
      options: [
        "HDFC Salary Account",
        "ICICI Sapphiro",
        "UPI / GPay",
        "ACH Auto-Debit",
        "Net Banking",
        "Cash",
      ],
      value: transaction?.channel,
    },
    {
      name: "date",
      label: "Date & Execution Timestamp",
      type: "date",
      value: transaction?.date ?? `${month}-22`,
    },
    { name: "name", label: "Merchant / Reference", value: transaction?.name },
    {
      name: "description",
      label: "Description",
      value: transaction?.description,
      required: false,
    },
  ];
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={transaction ? "Edit Transaction" : "Quick Add Transaction"}
      subtitle="Log debit or credit with instantaneous ledger balance sync"
    >
      <div className="mb-5">
        <label className="field-label">Transaction Nature</label>
        <Tabs
          value={kind}
          onChange={(value) => setKind(value as TransactionKind)}
          items={[
            { label: "Income (+)", value: "income" },
            { label: "Expense (−)", value: "expense" },
            { label: "Investment", value: "investment" },
            { label: "Loan / EMI", value: "loan" },
          ]}
        />
      </div>
      <RecordForm
        key={`${transaction?.id ?? "new"}-${kind}`}
        fields={fields}
        onCancel={onClose}
        submit="Save Transaction"
        onSave={(values) => {
          const record: Transaction = {
            id: transaction?.id ?? uid(),
            name: values.name,
            description: values.description,
            amount: Number(values.amount),
            kind,
            category: values.category,
            channel: values.channel,
            date: values.date,
          };
          update((current) => ({
            ...current,
            transactions: transaction
              ? current.transactions.map((item) =>
                  item.id === transaction.id ? record : item,
                )
              : [...current.transactions, record],
          }));
          notify(transaction ? "Transaction updated." : "Transaction added.");
          onClose();
        }}
      />
    </Modal>
  );
}
