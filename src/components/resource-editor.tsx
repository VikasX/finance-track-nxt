/*
 * src/components/resource-editor.tsx
 * Connects generated writable-field metadata to RecordForm. It turns a selected API record into editable fields and builds POST/PATCH bodies that exclude IDs and computed response fields.
 * "use client" marks the browser-interactive entry point: hooks/events or browser APIs
 * need JavaScript after hydration. Next may still prerender its initial HTML on the server.
 * Beginner syntax: @/ means src/ (tsconfig paths); import type is compile-time only.
 */
"use client";
// Import React hooks for local state/lifecycle/subscriptions and React types where needed. Hooks run at the component top level; type-only names disappear from the browser JavaScript.
import { useState } from "react";
// Import generated writable-field metadata. It prevents forms/tests from accidentally submitting read-only response fields.
import { writeContracts } from "@/lib/api-contract";
// Reuse the shared read cache/write flow. useApi supplies reactive request state; successful mutate calls invalidate cached data so subscribed screens refresh.
import { mutate } from "@/lib/api-cache";
// Import generated response types from openapi.json. These describe API field shapes to TypeScript; they do not fetch data or validate server JSON at runtime.
import type { CategoryRead } from "@/types/api";
// Read shared UI context for the selected month, global transaction dialog, or toast messages. Financial records still come from API hooks.
import { useFinance } from "./finance-provider";
// Import the shared styled UI pieces rather than repeating button/card/dialog/form markup. Their props let this screen supply content and event callbacks.
import { Modal, RecordForm, type FormField } from "./ui/primitives";
// Describe the subset of OpenAPI metadata needed for input construction. anyOf lists allowed alternatives; optional ? properties are not guaranteed on every field.
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
// Map machine field names to readable labels. Record<string, string> means any string key maps to a string label; it does not create form inputs by itself.
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
// Compare decimal strings without treating harmless trailing zero differences as edits. This avoids PATCHing a value that is numerically unchanged while preserving the original wire strings.
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
// Accept a resource path, optional existing record, defaults, and category options. No record means POST; a record means PATCH. contractPath can differ from the concrete URL for nested PPF resources.
export function ResourceEditor({
  path,
  contractPath = path,
  record,
  title,
  onClose,
  categories = [],
  defaults = {},
  // Rename the incoming fields prop to visibleFields during destructuring, avoiding a name clash with the derived FormField array below.
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
  // Destructure shared UI values and setters from FinanceProvider. Object braces select named properties; they do not create independent copies of the underlying state.
  const { notify } = useFinance();
  // React state stores whether this dialog is saving, so closing is guarded until the result is known. The setter (second array value) schedules a rerender when a control/event changes it; ordinary local variables would reset on each render.
  const [busy, setBusy] = useState(false);
  // React state stores the selected transaction nature/tab; changing it updates filters or allowed category choices. The setter (second array value) schedules a rerender when a control/event changes it; ordinary local variables would reset on each render.
  const [kind, setKind] = useState(
    String(
      (record as Record<string, unknown> | undefined)?.transaction_type ??
        defaults.transaction_type ??
        "expense",
    ),
  );
  // Look up writable-field rules generated from OpenAPI. The type assertion describes that metadata to TypeScript; it does not validate runtime data.
  const contract = (
    writeContracts as unknown as Record<
      string,
      { required: readonly string[]; fields: Record<string, Schema> }
    >
  )[contractPath];
  // Keep the original response values for edit comparisons; the form must submit only actual changes.
  const original = (record ?? {}) as Record<string, unknown>;
  // Adapt schema metadata to RecordForm field definitions so labels, options, required rules, and input types stay reusable across resource forms.
  const fields: FormField[] = Object.entries(contract.fields)
    .filter(
      ([key]) =>
        (!visibleFields || visibleFields.includes(key)) &&
        !(key === "category_id" && kind === "transfer"),
    )
    .map(([name, schema]) => {
      // anyOf can include a null alternative. Only nullable API fields may be explicitly cleared with JSON null.
      const nullable = schema.anyOf?.some((s) => s.type === "null");
      // Choose the non-null schema branch to discover the real input type/format; anyOf expresses a union of allowed shapes.
      const base = schema.anyOf?.find((s) => s.type !== "null") ?? schema;
      // OpenAPI permits numeric/string input alternatives for decimals. Use a numeric input in the form while retaining string values in outgoing JSON.
      const isDecimal = Boolean(schema.anyOf?.some((s) => s.type === "number"));
      const enums = schema.enum ?? base.enum;
      // Limit category options to the relevant transaction type (or expense for budgets), and include the nullable uncategorized choice when allowed.
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
        // An edit must preserve an existing null as an empty input; only creation uses defaults. ?? supplies a fallback for null/undefined without replacing legitimate zero values.
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
      {/* Field definitions below drive inputs and native required/min/max checks. onSave receives form strings and is awaited, so errors remain visible and repeated writes are blocked. */}
      <RecordForm
        fields={fields}
        onPendingChange={setBusy}
        onFieldChange={(name, value) => {
          // The form tells this editor when transaction nature changes. Updating kind rebuilds compatible category choices; it does not submit the form yet.
          if (name === "transaction_type") setKind(value);
        }}
        onCancel={onClose}
        submit={record ? "Save Changes" : "Create Record"}
        onSave={
          // This callback performs a backend write through mutate. Await success before closing/notifying; the shared cache then refreshes active reads, and failures propagate to the visible error handler.
          async (values) => {
            // Build a fresh object from writable changed fields instead of spreading the read response, which also contains IDs and computed values the API rejects.
            // RecordForm passes string-valued inputs here after native validation. The async callback resolves only after the API succeeds, so RecordForm can retain errors and pending state.
            const payload: Record<string, unknown> = {};
            // Loop through writable schema fields, never through every response property. Destructuring [name, schema] unpacks each Object.entries pair.
            for (const [name, schema] of Object.entries(contract.fields)) {
              if (!(name in values)) continue;
              const value = values[name];
              // anyOf can include a null alternative. Only nullable API fields may be explicitly cleared with JSON null.
              const nullable = schema.anyOf?.some((s) => s.type === "null");
              let writable: unknown = value;
              // A blank optional input can be omitted; a blank nullable input becomes JSON null. Null means clear the stored value, while an omitted PATCH field means leave it unchanged.
              if (value === "") {
                if (nullable) writable = null;
                else if (!contract.required.includes(name)) continue;
              } else if (
                // HTML controls provide strings even for select/number inputs. Convert integer IDs/counts, including nullable integer branches, while preserving decimal amounts as strings.
                schema.type === "integer" ||
                schema.anyOf?.some((option) => option.type === "integer")
              ) writable = Number(value);
              // Creation includes allowed supplied fields. Editing adds a field only if it differs from the original, keeping PATCH bodies minimal.
              if (!record || !same(original[name] ?? null, writable))
                payload[name] = writable;
            }
            // Transfers do not use a category. Editing a categorized transaction into a transfer explicitly clears the old category; creation simply omits it.
            if (kind === "transfer" && contractPath === "/api/transactions") {
              if (record && original.category_id != null)
                payload.category_id = null;
              else delete payload.category_id;
            }
            if (record && Object.keys(payload).length === 0) {
              onClose();
              return;
            }
            // A record selects PATCH /resource/id; absence selects POST /resource. mutate refreshes active cached data, and only then do we show success and close.
            await mutate(
              record ? `${path}/${record.id}` : path,
              record ? "PATCH" : "POST",
              payload,
            );
            notify(record ? "Changes saved." : "Record created.");
            onClose();
          }
        }
      />
    </Modal>
  );
}
