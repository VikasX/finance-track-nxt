"use client";
import { useState } from "react";
import { writeContracts } from "@/lib/api-contract";
import { mutate } from "@/lib/api-cache";
import type { CategoryRead } from "@/types/api";
import { useFinance } from "./finance-provider";
import { Modal, RecordForm, type FormField } from "./ui/primitives";
type Schema = {
  type?: string;
  format?: string;
  enum?: readonly string[];
  anyOf?: readonly Schema[];
  minimum?: number;
  exclusiveMinimum?: number;
  maximum?: number;
  maxLength?: number;
  default?: unknown;
};
const labels: Record<string, string> = {
  description: "Description / Merchant",
  amount: "Amount (₹)",
  transaction_type: "Transaction Nature",
  transaction_date: "Transaction Date",
  category_id: "Category",
  reference_code: "Reference Code",
  payment_method: "Payment Channel",
  budget_month: "Budget Month",
  limit_amount: "Monthly Limit (₹)",
  loan_name: "Loan Name",
  loan_type: "Loan Type",
  principal: "Principal Amount (₹)",
  outstanding_balance: "Outstanding Balance (₹)",
  interest_rate: "Interest Rate (% p.a.)",
  tenure_months: "Tenure (Months)",
  monthly_emi: "Stored Monthly EMI (₹)",
  start_date: "Start Date",
  next_due_date: "Next Due Date",
  account_reference: "Account Reference",
  asset_type: "Asset Class",
  quantity: "Quantity / Units",
  average_buy_price: "Average Buy Price (₹)",
  current_price: "Current Price (₹)",
  purchase_date: "Purchase Date",
  monthly_sip: "Monthly SIP (₹)",
  next_sip_date: "Next SIP Date",
  bank_name: "Bank Name",
  maturity_date: "Maturity Date",
  compounding_frequency: "Compounding Frequency",
  fd_reference: "Deposit Reference",
  opening_balance: "Opening Balance (₹)",
  current_balance: "Reported Current Balance (₹)",
  opening_date: "Opening Date",
  target_amount: "Target Amount (₹)",
  saved_amount: "Saved Amount (₹)",
  target_date: "Target Date",
  due_date: "Due Date",
  reminder_type: "Reminder Type",
  contribution_date: "Contribution Date",
  title: "Reminder Title",
  name: "Name",
  type: "Category Type",
  notes: "Notes",
  status: "Status",
  symbol: "Symbol",
};
function same(left: unknown, right: unknown) {
  if (left === right) return true;
  if (
    typeof left === "string" &&
    typeof right === "string" &&
    /^-?\d+(\.\d+)?$/.test(left) &&
    /^-?\d+(\.\d+)?$/.test(right)
  )
    return (
      left.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "") ===
      right.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "")
    );
  return false;
}
export function ResourceEditor({
  path,
  contractPath = path,
  record,
  title,
  onClose,
  categories = [],
  defaults = {},
  fields: visibleFields,
}: {
  path: string;
  contractPath?: string;
  record?: { id: number } & object;
  title: string;
  onClose: () => void;
  categories?: CategoryRead[];
  defaults?: Record<string, unknown>;
  fields?: string[];
}) {
  const { notify } = useFinance();
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState(
    String(
      (record as Record<string, unknown> | undefined)?.transaction_type ??
        defaults.transaction_type ??
        "expense",
    ),
  );
  const contract = (
    writeContracts as unknown as Record<
      string,
      { required: readonly string[]; fields: Record<string, Schema> }
    >
  )[contractPath];
  const original = (record ?? {}) as Record<string, unknown>;
  const fields: FormField[] = Object.entries(contract.fields)
    .filter(
      ([key]) =>
        (!visibleFields || visibleFields.includes(key)) &&
        !(key === "category_id" && kind === "transfer"),
    )
    .map(([name, schema]) => {
      const nullable = schema.anyOf?.some((s) => s.type === "null");
      const base = schema.anyOf?.find((s) => s.type !== "null") ?? schema;
      const isDecimal = Boolean(schema.anyOf?.some((s) => s.type === "number"));
      const enums = schema.enum ?? base.enum;
      const categoryOptions = [
        ...(nullable ? [{ value: "", label: "Uncategorized" }] : []),
        ...categories
          .filter((c) =>
            contractPath === "/api/budgets"
              ? c.type === "expense"
              : c.type === kind,
          )
          .map((c) => ({ value: String(c.id), label: c.name })),
      ];
      return {
        name,
        label: labels[name] ?? name,
        type:
          name === "category_id" || enums
            ? "select"
            : base.format === "date"
              ? "date"
              : isDecimal || base.type === "integer"
                ? "number"
                : "text",
        options:
          name === "category_id"
            ? categoryOptions
            : enums
              ? [...enums]
              : undefined,
        value: (name in original
          ? (original[name] ?? "")
          : (defaults[name] ?? schema.default ?? "")) as string | number,
        required: contract.required.includes(name),
        step: base.type === "integer" ? "1" : "any",
        min:
          base.minimum ??
          (base.exclusiveMinimum != null
            ? base.exclusiveMinimum + 0.000001
            : undefined),
        max: base.maximum,
      };
    });
  return (
    <Modal
      open
      onClose={() => {
        if (!busy) onClose();
      }}
      busy={busy}
      title={title}
    >
      <RecordForm
        fields={fields}
        onPendingChange={setBusy}
        onFieldChange={(name, value) => {
          if (name === "transaction_type") setKind(value);
        }}
        onCancel={onClose}
        submit={record ? "Save Changes" : "Create Record"}
        onSave={async (values) => {
          const payload: Record<string, unknown> = {};
          for (const [name, schema] of Object.entries(contract.fields)) {
            if (!(name in values)) continue;
            const value = values[name];
            const nullable = schema.anyOf?.some((s) => s.type === "null");
            let writable: unknown = value;
            if (value === "") {
              if (nullable) writable = null;
              else if (!contract.required.includes(name)) continue;
            } else if (
              schema.type === "integer" ||
              schema.anyOf?.some((option) => option.type === "integer")
            ) writable = Number(value);
            if (!record || !same(original[name] ?? null, writable))
              payload[name] = writable;
          }
          if (kind === "transfer" && contractPath === "/api/transactions") {
            if (record && original.category_id != null)
              payload.category_id = null;
            else delete payload.category_id;
          }
          if (record && Object.keys(payload).length === 0) {
            onClose();
            return;
          }
          await mutate(
            record ? `${path}/${record.id}` : path,
            record ? "PATCH" : "POST",
            payload,
          );
          notify(record ? "Changes saved." : "Record created.");
          onClose();
        }}
      />
    </Modal>
  );
}
