/*
 * src/components/transaction-editor.tsx
 * A transaction-specific wrapper around ResourceEditor. It loads categories before showing the form and supports both a new transaction and an existing record.
 * "use client" marks the browser-interactive entry point: hooks/events or browser APIs
 * need JavaScript after hydration. Next may still prerender its initial HTML on the server.
 * Beginner syntax: @/ means src/ (tsconfig paths); import type is compile-time only.
 */
"use client";
// Import generated response types from openapi.json. These describe API field shapes to TypeScript; they do not fetch data or validate server JSON at runtime.
import type { CategoryRead, TransactionRead } from "@/types/api";
// Reuse the shared read cache/write flow. useApi supplies reactive request state; successful mutate calls invalidate cached data so subscribed screens refresh.
import { useApi } from "@/lib/api-cache";
// Read shared UI context for the selected month, global transaction dialog, or toast messages. Financial records still come from API hooks.
import { useFinance } from "./finance-provider";
// Use the common schema-based create/edit dialog; it owns writable payload construction and delegates input rendering to RecordForm.
import { ResourceEditor } from "./resource-editor";
// Use the common loading/error/retry wrapper, keeping request failure visibly different from an empty successful response.
import { ApiBoundary } from "./ui/api-boundary";
// Import the shared styled UI pieces rather than repeating button/card/dialog/form markup. Their props let this screen supply content and event callbacks.
import { Modal } from "./ui/primitives";
// Choose between category loading/error UI and the schema-driven transaction form. Passing an existing transaction changes the shared editor into edit mode.
export function TransactionEditor({
  open,
  onClose,
  transaction,
}: {
  open: boolean;
  onClose: () => void;
  transaction?: TransactionRead;
}) {
  // Destructure shared UI values and setters from FinanceProvider. Object braces select named properties; they do not create independent copies of the underlying state.
  const { month } = useFinance();
  // Subscribe categories to this API key. The type inside <...> describes the returned data; loading/error/retry travel with it. A changed URL selects a new cached request, and null skips the read.
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
        {/* Request state belongs here: show initial loading or an error with Retry before treating the following content as successful data. */}
        <ApiBoundary query={categories}>{null}</ApiBoundary>
      </Modal>
    );
  return (
    <ApiBoundary query={categories}>
      {/* Open the reusable write dialog with the selected record/defaults. Its save flow constructs allowed fields, awaits the API, then refreshes cached reads. */}
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
