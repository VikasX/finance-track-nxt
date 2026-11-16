"use client";
import { useState } from "react";
import { ThemeControl } from "../theme-control";
import type { CategoryRead, SettingsRead } from "@/types/api";
import { fetchAll, errorMessage } from "@/lib/api-client";
import { mutate, useApi } from "@/lib/api-cache";
import { downloadFile } from "@/lib/finance";
import { useFinance } from "../finance-provider";
import { ResourceEditor } from "../resource-editor";
import { ApiBoundary } from "../ui/api-boundary";
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
import { Icon } from "../ui/icon";
export function Settings() {
  const settings = useApi<SettingsRead>("/api/settings");
  const categories = useApi<CategoryRead[]>("all:/api/categories");
  const { notify } = useFinance();
  const [tab, setTab] = useState("General & Profile");
  const [category, setCategory] = useState<CategoryRead | null | undefined>();
  const [deleting, setDeleting] = useState<CategoryRead>();
  const [accounts, setAccounts] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
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
  async function backup() {
    if (exporting) return;
    setExporting(true);
    setExportError("");
    try {
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
      <ApiBoundary query={settings}>
        {settings.data && (
          <ProfileSettings
            key={JSON.stringify(settings.data)}
            settings={settings.data}
          />
        )}
      </ApiBoundary>
      <Card
        id="categories"
        title="Custom Categories & Tag Management"
        subtitle="Shared categories are read-only; personal categories can be edited or deleted."
        action={
          <Button
            variant="primary"
            icon="add_circle"
            onClick={() => setCategory(null)}
          >
            Add Custom Category
          </Button>
        }
      >
        <ApiBoundary query={categories}>
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
                        onClick={() => setCategory(c)}
                      >
                        {c.name}
                      </button>
                      {c.user_id === null ? (
                        <Badge tone="gray">Shared</Badge>
                      ) : (
                        <button
                          className="icon-button !w-5 !h-5"
                          aria-label={`Delete category ${c.name}`}
                          onClick={() => setDeleting(c)}
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
      <Card
        title="Notification & Reminder Preferences"
        subtitle="Notification settings and delivery are not available in the current API."
      >
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
      {category !== undefined && (
        <ResourceEditor
          path="/api/categories"
          record={category ?? undefined}
          title={category ? "Edit Custom Category" : "Add Custom Category"}
          onClose={() => setCategory(undefined)}
        />
      )}
      <ConfirmDelete
        key={deleting?.id ?? "none"}
        open={Boolean(deleting)}
        title="Delete category?"
        description="Referenced categories may be protected by the API. Shared categories cannot be deleted."
        onClose={() => setDeleting(undefined)}
        onConfirm={async () => {
          if (deleting && deleting.user_id !== null)
            await mutate(`/api/categories/${deleting.id}`, "DELETE");
        }}
      />
      <Modal
        open={accounts}
        title="Linked Accounts & Channels"
        onClose={() => setAccounts(false)}
      >
        <EmptyState text="The API stores transaction payment methods but does not expose bank-linking or account synchronization endpoints." />
      </Modal>
    </div>
  );
}
function ProfileSettings({ settings }: { settings: SettingsRead }) {
  const { notify } = useFinance();
  const p = settings.preferences;
  return (
    <>
      <Card
        id="profile"
        title="Profile & Identity"
        subtitle="Profile details and financial formatting preferences"
      >
        <div className="profile-settings mb-6">
          <div className="avatar-editor">
            <span className="large-avatar">
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
          onSave={async (values) => {
            const existing: Record<string, unknown> = {
              name: settings.profile.name,
              email: settings.profile.email,
              currency: p?.currency ?? "INR",
              number_format: p?.number_format ?? "indian",
              financial_year_start: p?.financial_year_start ?? 4,
            };
            const payload: Record<string, unknown> = {};
            for (const [key, value] of Object.entries(values)) {
              const next =
                key === "financial_year_start" ? Number(value) : value;
              if (next !== existing[key]) payload[key] = next;
            }
            if (Object.keys(payload).length)
              await mutate("/api/settings", "PATCH", payload);
            notify("Settings saved.");
          }}
        />
      </Card>
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
