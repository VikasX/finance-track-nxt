/*
 * src/components/pages/settings.tsx
 * Loads profile/preferences and categories. Profile saves use a flat changed-fields PATCH; shared categories stay read-only, theme stays on the device, and backup is a read-only export.
 * "use client" marks the browser-interactive entry point: hooks/events or browser APIs
 * need JavaScript after hydration. Next may still prerender its initial HTML on the server.
 * Beginner syntax: @/ means src/ (tsconfig paths); import type is compile-time only.
 */
"use client";
// Import React hooks for local state/lifecycle/subscriptions and React types where needed. Hooks run at the component top level; type-only names disappear from the browser JavaScript.
import { useState } from "react";
// Use the shared appearance selector rather than creating another light/dark state in this screen.
import { ThemeControl } from "../theme-control";
// Import generated response types from openapi.json. These describe API field shapes to TypeScript; they do not fetch data or validate server JSON at runtime.
import type { CategoryRead, SettingsRead } from "@/types/api";
// Reuse URL, HTTP, or error helpers instead of duplicating fetch/parsing rules in this file. Browser /api paths are forwarded by the Next proxy.
import { fetchAll, errorMessage } from "@/lib/api-client";
// Reuse the shared read cache/write flow. useApi supplies reactive request state; successful mutate calls invalidate cached data so subscribed screens refresh.
import { mutate, useApi } from "@/lib/api-cache";
// Reuse formatting, local calculator, or download helpers. These utilities do not perform backend writes.
import { downloadFile } from "@/lib/finance";
// Read shared UI context for the selected month, global transaction dialog, or toast messages. Financial records still come from API hooks.
import { useFinance } from "../finance-provider";
// Use the common schema-based create/edit dialog; it owns writable payload construction and delegates input rendering to RecordForm.
import { ResourceEditor } from "../resource-editor";
// Use the common loading/error/retry wrapper, keeping request failure visibly different from an empty successful response.
import { ApiBoundary } from "../ui/api-boundary";
// Import the shared styled UI pieces rather than repeating button/card/dialog/form markup. Their props let this screen supply content and event callbacks.
import {
  Badge,
  Button,
  Card,
  ConfirmDelete,
  EmptyState,
  Modal,
  PageHeading,
  RecordForm,
  Tabs,
} from "../ui/primitives";
// Resolve existing design icon names through the shared Lucide mapping, keeping icon rendering consistent.
import { Icon } from "../ui/icon";
// Render the Settings screen. Read API data first, derive display rows, then return JSX; props/state determine which controls and dialogs are visible.
export function Settings() {
  // Subscribe settings to this API key. The type inside <...> describes the returned data; loading/error/retry travel with it. A changed URL selects a new cached request, and null skips the read.
  const settings = useApi<SettingsRead>("/api/settings");
  // Subscribe categories to this API key. The type inside <...> describes the returned data; loading/error/retry travel with it. A changed URL selects a new cached request, and null skips the read.
  const categories = useApi<CategoryRead[]>("all:/api/categories");
  // Destructure shared UI values and setters from FinanceProvider. Object braces select named properties; they do not create independent copies of the underlying state.
  const { notify } = useFinance();
  // React state stores the selected tab; its value drives the displayed/filtered content. The setter (second array value) schedules a rerender when a control/event changes it; ordinary local variables would reset on each render.
  const [tab, setTab] = useState("General & Profile");
  // React state stores the chosen category filter or editable category record, depending on this screen. The setter (second array value) schedules a rerender when a control/event changes it; ordinary local variables would reset on each render.
  const [category, setCategory] = useState<CategoryRead | null | undefined>();
  // Remember the record chosen for deletion so the confirmation dialog can target it. Clearing the selection closes the dialog.
  const [deleting, setDeleting] = useState<CategoryRead>();
  // React state stores whether the linked-accounts explanation is open. The setter (second array value) schedules a rerender when a control/event changes it; ordinary local variables would reset on each render.
  const [accounts, setAccounts] = useState(false);
  // React state stores whether all export reads are running. The setter (second array value) schedules a rerender when a control/event changes it; ordinary local variables would reset on each render.
  const [exporting, setExporting] = useState(false);
  // React state stores the read/download failure to show instead of reporting export success. The setter (second array value) schedules a rerender when a control/event changes it; ordinary local variables would reset on each render.
  const [exportError, setExportError] = useState("");
  // Update the highlighted settings tab and scroll to its section. Linked accounts opens an explanatory dialog because the API has no bank-linking endpoint.
  function selectTab(value: string) {
    setTab(value);
    if (value === "Linked Accounts & Channels") {
      setAccounts(true);
      return;
    }
    document
      .getElementById(
        value === "General & Profile"
          ? "profile"
          : value === "Financial Preferences"
            ? "preferences"
            : value === "Categories & Rules"
              ? "categories"
              : "security",
      )
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  // Fetch every collection page in parallel and download a JSON snapshot with settings. This exports records; it does not provide bulk restore or modify backend data.
  async function backup() {
    if (exporting) return;
    setExporting(true);
    setExportError("");
    try {
      // Allowed finance resources or the collection names this operation processes; keeping the list explicit avoids arbitrary endpoint traversal.
      const resources = [
        "transactions",
        "categories",
        "budgets",
        "loans",
        "investments",
        "fixed-deposits",
        "ppf",
        "savings-goals",
        "reminders",
      ];
      // Prepare result by transforming each source item. map returns a new array; the response records remain available in their original shape.
      const result = await Promise.all(
        resources.map(
          async (name) => [name, await fetchAll(`/api/${name}`)] as const,
        ),
      );
      downloadFile(
        "fintrack-api-backup.json",
        JSON.stringify(
          {
            exported_at: new Date().toISOString(),
            settings: settings.data,
            collections: Object.fromEntries(result),
          },
          null,
          2,
        ),
        "application/json",
      );
      notify("Financial records exported.");
    } catch (error) {
      setExportError(errorMessage(error));
    } finally {
      setExporting(false);
    }
  }
  return (
    <div className="page-stack">
      {/* Page title and primary actions share the same layout classes; callbacks below change state or start an operation when clicked. */}
      <PageHeading
        title="Settings"
        eyebrow="System Preferences"
        badge="API Connected"
        description="Manage your profile, financial preferences, categories, and data exports."
        actions={<Badge tone="gray">Connected finance account</Badge>}
      />
      <div className="settings-tabs">
        <Tabs
          value={tab}
          onChange={selectTab}
          items={[
            "General & Profile",
            "Financial Preferences",
            "Categories & Rules",
            "Linked Accounts & Channels",
            "Data & Export",
          ]}
        />
      </div>
      {/* Request state belongs here: show initial loading or an error with Retry before treating the following content as successful data. */}
      <ApiBoundary query={settings}>
        {/* Conditional JSX: render the following block only when the left-hand condition is truthy; otherwise React leaves it out. */}
        {settings.data && (
          <ProfileSettings
            key={JSON.stringify(settings.data)}
            settings={settings.data}
          />
        )}
      </ApiBoundary>
      {/* Custom Categories & Tag Management section: the shared Card supplies the existing surface/spacing, while this screen supplies its contents. */}
      <Card
        id="categories"
        title="Custom Categories & Tag Management"
        subtitle="Shared categories are read-only; personal categories can be edited or deleted."
        action={
          <Button
            variant="primary"
            icon="add_circle"
            onClick={
              // null opens a blank custom-category form. The API write happens only on submit.
              () => setCategory(null)
            }
          >
            Add Custom Category
          </Button>
        }
      >
        {/* Request state belongs here: show initial loading or an error with Retry before treating the following content as successful data. */}
        <ApiBoundary query={categories}>
          {/* Turn matching items into JSX with map. Each repeated element needs a stable key so React preserves the right row/control when data changes. */}
          {["income", "expense", "investment", "loan_payment"].map((type) => (
            <div className="category-group mb-4" key={type}>
              <div className="flex justify-between mb-4">
                <strong className="text-xs capitalize">
                  {type.replaceAll("_", " ")} Categories
                </strong>
                <span className="muted text-[10px]">
                  {categories.data?.filter((c) => c.type === type).length}{" "}
                  categories
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {/* Turn matching items into JSX with map. Each repeated element needs a stable key so React preserves the right row/control when data changes. */}
                {categories.data
                  ?.filter((c) => c.type === type)
                  .map((c) => (
                    <div className="category-chip" key={c.id}>
                      <i className="bg-violet-600" />
                      <button
                        disabled={c.user_id === null}
                        title={
                          c.user_id === null
                            ? "Shared category cannot be edited"
                            : "Edit category"
                        }
                        onClick={
                          // Pass this personal category record to the shared edit form;
                          // the form compares writable values before sending PATCH.
                          () => setCategory(c)
                        }
                      >
                        {c.name}
                      </button>
                      {/* Choose one of two UI branches with condition ? trueBranch : falseBranch. This keeps selected/empty/alternate states in the same layout position. */}
                      {c.user_id === null ? (
                        <Badge tone="gray">Shared</Badge>
                      ) : (
                        <button
                          className="icon-button !w-5 !h-5"
                          aria-label={`Delete category ${c.name}`}
                          onClick={
                            // Remember the selected record for a confirmation dialog, or clear it on close. Selecting it alone does not send DELETE.
                            () => setDeleting(c)
                          }
                        >
                          <Icon name="delete" size={12} />
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </ApiBoundary>
      </Card>
      {/* Notification & Reminder Preferences section: the shared Card supplies the existing surface/spacing, while this screen supplies its contents. */}
      <Card
        title="Notification & Reminder Preferences"
        subtitle="Notification settings and delivery are not available in the current API."
      >
        {/* Turn matching items into JSX with map. Each repeated element needs a stable key so React preserves the right row/control when data changes. */}
        {[
          "EMI Due Date Reminders (3 days prior)",
          "Budget Threshold 80% Warning",
          "Weekly Spending Digest",
          "Unusual Volatility & Portfolio Drops",
        ].map((title) => (
          <div className="notification-setting" key={title}>
            <div>
              <strong>{title}</strong>
              <p>Not configured · endpoint unavailable</p>
            </div>
            <button
              role="switch"
              aria-checked={false}
              aria-label={title}
              disabled
              className="switch"
            >
              <span />
            </button>
          </div>
        ))}
      </Card>
      {/* Security & Data Backup section: the shared Card supplies the existing surface/spacing, while this screen supplies its contents. */}
      <Card
        id="security"
        title="Security & Data Backup"
        subtitle="Export copies of your current financial records."
      >
        <div className="grid-halves">
          <div className="preference-tile">
            <strong>Connected API Data</strong>
            <span>
              Financial records are stored by your backend. Browser-local demo
              records are no longer used.
            </span>
            <div className="positive text-[10px] mt-3">
              No database credentials are stored in the frontend.
            </div>
          </div>
          <div className="preference-tile">
            <strong>Portable Snapshots</strong>
            <span>
              Download the available collections and settings as JSON.
            </span>
            <div className="flex gap-2 flex-wrap mt-3">
              <Button
                icon="download"
                disabled={exporting || !settings.data}
                onClick={() => void backup()}
              >
                {/* Choose one of two UI branches with condition ? trueBranch : falseBranch. This keeps selected/empty/alternate states in the same layout position. */}
                {exporting ? "Exporting…" : "Export Full Backup (JSON)"}
              </Button>
              <Button
                icon="file_upload"
                disabled
                title="No bulk import endpoint exists"
              >
                Import Data Archive
              </Button>
            </div>
            <p className="muted text-[10px]">
              Bulk restore is not supported by the API.
            </p>
            {/* Conditional JSX: render the following block only when the left-hand condition is truthy; otherwise React leaves it out. */}
            {exportError && (
              <p role="alert" className="api-error">
                {exportError}
              </p>
            )}
          </div>
        </div>
        <div className="danger-zone">
          <div>
            <strong>Delete Financial Records</strong>
            <p>
              Bulk reset is unavailable. Delete individual records in their
              module.
            </p>
          </div>
          <Button variant="danger" icon="delete" disabled>
            Delete Financial Records
          </Button>
        </div>
      </Card>
      {/* Conditional JSX: render the following block only when the left-hand condition is truthy; otherwise React leaves it out. */}
      {category !== undefined && (
        <ResourceEditor
          path="/api/categories"
          record={category ?? undefined}
          title={category ? "Edit Custom Category" : "Add Custom Category"}
          onClose={
            // undefined clears the category selection and unmounts the create/edit dialog.
            () => setCategory(undefined)
          }
        />
      )}
      {/* Keep destructive writes behind confirmation. The callback awaits DELETE; failures stay in the dialog and a successful 204 has no JSON body. */}
      <ConfirmDelete
        key={deleting?.id ?? "none"}
        open={Boolean(deleting)}
        title="Delete category?"
        description="Referenced categories may be protected by the API. Shared categories cannot be deleted."
        onClose={
          // Remember the selected record for a confirmation dialog, or clear it on close. Selecting it alone does not send DELETE.
          () => setDeleting(undefined)
        }
        onConfirm={
          // This callback performs a backend write through mutate. Await success before closing/notifying; the shared cache then refreshes active reads, and failures propagate to the visible error handler.
          async () => {
            if (deleting && deleting.user_id !== null)
              await mutate(`/api/categories/${deleting.id}`, "DELETE");
          }
        }
      />
      {/* The parent owns open/close state; Modal handles the native dialog and scroll cleanup. Content is only mounted while open. */}
      <Modal
        open={accounts}
        title="Linked Accounts & Channels"
        onClose={
          // Open/close the explanation of unavailable bank-linking support; no account connection API is called.
          () => setAccounts(false)
        }
      >
        <EmptyState text="The API stores transaction payment methods but does not expose bank-linking or account synchronization endpoints." />
      </Modal>
    </div>
  );
}
// Receive the last successful SettingsRead as props, seed uncontrolled form inputs, and compare submitted values with the response before a flat settings PATCH.
function ProfileSettings({ settings }: { settings: SettingsRead }) {
  // Destructure shared UI values and setters from FinanceProvider. Object braces select named properties; they do not create independent copies of the underlying state.
  const { notify } = useFinance();
  const p = settings.preferences;
  return (
    <>
      {/* Profile & Identity section: the shared Card supplies the existing surface/spacing, while this screen supplies its contents. */}
      <Card
        id="profile"
        title="Profile & Identity"
        subtitle="Profile details and financial formatting preferences"
      >
        <div className="profile-settings mb-6">
          <div className="avatar-editor">
            <span className="large-avatar">
              {/* Turn matching items into JSX with map. Each repeated element needs a stable key so React preserves the right row/control when data changes. */}
              {settings.profile.name
                .split(" ")
                .map((s) => s[0])
                .slice(0, 2)
                .join("")}
            </span>
            <Button disabled title="Avatar upload endpoint unavailable">
              Change Avatar
            </Button>
          </div>
          <div className="flex-1">
            <h3>{settings.profile.name}</h3>
            <p className="muted text-xs">{settings.profile.email}</p>
            <p className="muted text-[10px] mt-3">
              Phone, PAN, and avatar storage are not exposed by the current
              contract.
            </p>
          </div>
        </div>
        {/* Field definitions below drive inputs and native required/min/max checks. onSave receives form strings and is awaited, so errors remain visible and repeated writes are blocked. */}
        <RecordForm
          fields={[
            {
              name: "name",
              label: "Full Legal Name",
              value: settings.profile.name,
            },
            {
              name: "email",
              label: "Primary Email",
              type: "email",
              value: settings.profile.email,
            },
            {
              name: "currency",
              label: "Base Currency",
              type: "select",
              options: ["INR", "USD", "EUR", "GBP", "SGD", "AED"],
              value: p?.currency ?? "INR",
            },
            {
              name: "number_format",
              label: "Number Formatting System",
              type: "select",
              options: [
                { value: "indian", label: "Lakhs & Crores" },
                { value: "international", label: "Millions & Billions" },
                { value: "compact", label: "Compact" },
              ],
              value: p?.number_format ?? "indian",
            },
            {
              name: "financial_year_start",
              label: "Financial Year Start Month",
              type: "select",
              options: Array.from({ length: 12 }, (_, i) => ({
                value: String(i + 1),
                label: new Date(2024, i, 1).toLocaleDateString("en-IN", {
                  month: "long",
                }),
              })),
              value: p?.financial_year_start ?? 4,
            },
          ]}
          onCancel={() => notify("No changes were submitted.")}
          submit="Save Changes"
          onSave={
            // This callback performs a backend write through mutate. Await success before closing/notifying; the shared cache then refreshes active reads, and failures propagate to the visible error handler.
            async (values) => {
              // Flatten profile/preference response fields for comparison: settings PATCH expects writable keys at the top level, not nested profile/preferences objects.
              const existing: Record<string, unknown> = {
                name: settings.profile.name,
                email: settings.profile.email,
                currency: p?.currency ?? "INR",
                number_format: p?.number_format ?? "indian",
                financial_year_start: p?.financial_year_start ?? 4,
              };
              // Build a fresh object from writable changed fields instead of spreading the read response, which also contains IDs and computed values the API rejects.
              const payload: Record<string, unknown> = {};
              for (const [key, value] of Object.entries(values)) {
                // Form values are strings; financial_year_start is an integer. Normalize it before comparison so an unchanged month is not included in PATCH.
                const next =
                  key === "financial_year_start" ? Number(value) : value;
                if (next !== existing[key]) payload[key] = next;
              }
              if (Object.keys(payload).length)
                await mutate("/api/settings", "PATCH", payload);
              notify("Settings saved.");
            }
          }
        />
      </Card>
      {/* Financial Localization & Appearance section: the shared Card supplies the existing surface/spacing, while this screen supplies its contents. */}
      <Card
        id="preferences"
        title="Financial Localization & Appearance"
        subtitle="Saved number formatting applies across the interface. Currency selection does not convert historical amounts."
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <strong className="text-xs">Color Theme</strong>
            <p className="muted text-xs mt-1">
              Light, dark, or system · saved on this device
            </p>
          </div>
          <ThemeControl label="Settings color theme" />
        </div>
        <p className="muted text-[10px] mt-4">
          Monthly budget start day and rollover preferences are not supported by
          the API.
        </p>
      </Card>
    </>
  );
}
