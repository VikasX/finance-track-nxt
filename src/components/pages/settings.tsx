"use client";
import Image from "next/image";
import { useRef, useState } from "react";
import { useFinance } from "../finance-provider";
import { downloadFile } from "@/lib/finance";
import { validateBackup } from "@/lib/backup";
import type { Preferences } from "@/types/finance";
import {
  Badge,
  Button,
  Card,
  ConfirmDelete,
  Modal,
  PageHeading,
  RecordForm,
  Tabs,
} from "../ui/primitives";
import { Icon } from "../ui/icon";
export function Settings() {
  const { state } = useFinance();
  return (
    <SettingsForm
      key={JSON.stringify(state.preferences)}
      initial={state.preferences}
    />
  );
}
function SettingsForm({ initial }: { initial: Preferences }) {
  const { state, update, notify } = useFinance();
  const [draft, setDraft] = useState(initial);
  const [tab, setTab] = useState("General & Profile");
  const [category, setCategory] = useState<string | null | undefined>();
  const [deleteCategory, setDeleteCategory] = useState(false);
  const [reset, setReset] = useState(false);
  const [accounts, setAccounts] = useState(false);
  const [draftCategories, setDraftCategories] = useState(state.categories);
  const avatarRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const dirty =
    JSON.stringify(draft) !== JSON.stringify(initial) ||
    JSON.stringify(draftCategories) !== JSON.stringify(state.categories);
  const notificationOptions = [
    {
      title: "EMI Due Date Reminders (3 days prior)",
      description:
        "Reminder preference for home loan, car loan, and credit card dues.",
    },
    {
      title: "Budget Threshold 80% Warning",
      description:
        "Alert preference when dynamic category consumption touches your warning threshold.",
    },
    {
      title: "Weekly Spending Digest",
      description:
        "Sunday evening summary of spending compared with the previous week.",
    },
    {
      title: "Unusual Volatility & Portfolio Drops",
      description:
        "Alert preference when holdings swing more than ±3.5% in a single trading session.",
    },
  ];
  function preference<K extends keyof Preferences>(
    key: K,
    value: Preferences[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }
  function selectTab(value: string) {
    setTab(value);
    const section =
      value === "General & Profile"
        ? "profile"
        : value === "Financial Preferences"
          ? "preferences"
          : value === "Categories & Rules"
            ? "categories"
            : "security";
    if (value === "Linked Accounts & Channels") {
      setAccounts(true);
      return;
    }
    document
      .getElementById(section)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  async function importBackup(file?: File) {
    if (!file) return;
    try {
      if (file.size > 10000000)
        throw new Error("Backup exceeds the 10 MB import limit.");
      const data: unknown = JSON.parse(await file.text());
      if (!validateBackup(data))
        throw new Error(
          "Invalid FinTrack backup. Import an unmodified JSON backup exported by this app.",
        );
      update(() => data);
      notify("Backup restored successfully.");
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Unable to import backup.",
      );
    }
    if (importRef.current) importRef.current.value = "";
  }
  async function avatar(file?: File) {
    if (!file) return;
    if (
      !["image/jpeg", "image/png"].includes(file.type) ||
      file.size > 4 * 1024 * 1024
    ) {
      notify("Choose a JPG or PNG smaller than 4 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => preference("avatar", String(reader.result));
    reader.readAsDataURL(file);
  }
  return (
    <div className="page-stack">
      <PageHeading
        title="Settings"
        eyebrow="System Preferences"
        badge="Local demo workspace"
        description="Manage your account profile, financial preferences, transaction categories, and data options."
        actions={<Badge tone="gray">Browser-local data</Badge>}
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
      <form
        id="settings-form"
        onSubmit={(event) => {
          event.preventDefault();
          update((current) => ({
            ...current,
            preferences: draft,
            categories: draftCategories,
          }));
          notify("Settings saved.");
        }}
      >
        <div className="page-stack">
          <Card
            id="profile"
            title="Profile & Identity"
            subtitle="Update primary contact data, account handles, and profile details."
            action={<Badge>Demo Profile</Badge>}
          >
            <div className="profile-settings">
              <div className="avatar-editor">
                {draft.avatar ? (
                  <Image
                    src={draft.avatar}
                    alt="Profile avatar preview"
                    width={80}
                    height={80}
                    unoptimized
                  />
                ) : (
                  <span className="large-avatar">
                    {draft.name
                      .split(" ")
                      .map((s) => s[0])
                      .slice(0, 2)
                      .join("")}
                  </span>
                )}
                <input
                  className="hidden"
                  type="file"
                  accept="image/jpeg,image/png"
                  ref={avatarRef}
                  onChange={(e) => avatar(e.target.files?.[0])}
                />
                <Button
                  icon="upload"
                  onClick={() => avatarRef.current?.click()}
                >
                  Change Avatar
                </Button>
                <p className="muted text-[10px]">JPG, PNG up to 4MB</p>
              </div>
              <div className="form-grid flex-1">
                <label className="field">
                  Full Legal Name
                  <input
                    value={draft.name}
                    onChange={(e) => preference("name", e.target.value)}
                    required
                    maxLength={80}
                  />
                </label>
                <label className="field">
                  Primary Email
                  <input
                    type="email"
                    value={draft.email}
                    onChange={(e) => preference("email", e.target.value)}
                    required
                  />
                </label>
                <label className="field">
                  Contact Phone Number
                  <input
                    type="tel"
                    value={draft.phone}
                    onChange={(e) => preference("phone", e.target.value)}
                  />
                </label>
                <label className="field">
                  PAN / Tax ID (Optional for IT Returns)
                  <input
                    value={draft.pan}
                    onChange={(e) =>
                      preference("pan", e.target.value.toUpperCase())
                    }
                    pattern="[A-Z]{5}[0-9]{4}[A-Z]"
                    maxLength={10}
                    title="PAN format: ABCDE1234F"
                  />
                </label>
              </div>
            </div>
          </Card>
          <Card
            id="preferences"
            title="Financial Localization & Preferences"
            subtitle="Control currency preferences, financial years, and budget reconciliation dates."
            action={<Badge tone="gray">Locale: en-IN</Badge>}
          >
            <div className="form-grid">
              {[
                {
                  key: "currency" as const,
                  label: "Base Currency",
                  text: "Preferred currency for future connected financial accounts.",
                  options: [
                    ["INR", "Indian Rupee (INR ₹)"],
                    ["USD", "US Dollar (USD $)"],
                    ["EUR", "Euro (EUR €)"],
                    ["GBP", "British Pound (GBP £)"],
                    ["SGD", "Singapore Dollar (SGD S$)"],
                    ["AED", "UAE Dirham (AED)"],
                  ],
                },
                {
                  key: "numberFormat" as const,
                  label: "Number Formatting System",
                  text: "Preferred metric separation for financial reports.",
                  options: [
                    ["Indian", "Lakhs & Crores (e.g. ₹12,50,000)"],
                    ["International", "Millions & Billions (e.g. ₹1,250,000)"],
                    ["Compact", "SI Standard Compact (e.g. ₹1.25M)"],
                  ],
                },
                {
                  key: "financialYear" as const,
                  label: "Financial Year Cycle",
                  text: "Tax-year tracking preference for annual deductions.",
                  options: [
                    ["April - March", "April - March (Indian Fiscal Year)"],
                    [
                      "January - December",
                      "January - December (Calendar Year)",
                    ],
                    ["July - June", "July - June (Australian Fiscal Year)"],
                    [
                      "October - September",
                      "October - September (US Federal Cycle)",
                    ],
                  ],
                },
                {
                  key: "budgetDay" as const,
                  label: "Monthly Budget Start Day",
                  text: "The rollover checkpoint for monthly allowances.",
                  options: [
                    ["1", "1st of the month (Standard)"],
                    ["5", "5th of the month (Salary credit offset)"],
                    ["10", "10th of the month"],
                    ["25", "25th of the month"],
                    ["last", "Last day of the month"],
                  ],
                },
              ].map((item) => (
                <label key={item.key} className="preference-tile">
                  <strong>{item.label}</strong>
                  <span>{item.text}</span>
                  <select
                    value={draft[item.key]}
                    onChange={(e) => preference(item.key, e.target.value)}
                  >
                    {item.options.map(([value, label]) => (
                      <option value={value} key={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <p className="muted text-[10px] mt-4">
              The design&apos;s October 2024 demo dataset is denominated in INR.
              These preferences are saved for future account integration.
            </p>
          </Card>
          <Card
            id="categories"
            title="Custom Categories & Tag Management"
            subtitle="Classify transaction categories and personalize ledger tags."
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
            <div className="space-y-4">
              {[
                {
                  name: "Income Categories",
                  values: draftCategories.filter((c) =>
                    ["Salary", "Freelance", "Dividends", "Interest"].includes(
                      c,
                    ),
                  ),
                  tone: "green",
                },
                {
                  name: "Expense Categories",
                  values: draftCategories.filter(
                    (c) =>
                      ![
                        "Salary",
                        "Freelance",
                        "Dividends",
                        "Interest",
                      ].includes(c),
                  ),
                  tone: "red",
                },
              ].map((group) => (
                <div className="category-group" key={group.name}>
                  <div className="flex justify-between mb-4">
                    <strong className="text-xs">
                      {group.name}{" "}
                      <span className="muted text-[10px] font-normal ml-2">
                        {group.values.length} active
                      </span>
                    </strong>
                    <span className="muted text-[10px]">
                      Used in ledger filters
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {group.values.map((item) => (
                      <button
                        type="button"
                        className="category-chip"
                        key={item}
                        onClick={() => setCategory(item)}
                      >
                        <i
                          className={
                            group.tone === "green"
                              ? "bg-emerald-700"
                              : "bg-violet-600"
                          }
                        />
                        {item}
                        <Icon name="more_vert" size={13} />
                      </button>
                    ))}
                    <button
                      type="button"
                      className="category-chip !bg-transparent"
                      onClick={() => setCategory(null)}
                    >
                      + Add Category
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card
            title="Notification & Reminder Preferences"
            subtitle="Direct alerting preferences across browser and email channels."
            action={
              <span className="muted text-[10px]">
                Delivery channel: Browser & Email
              </span>
            }
          >
            {notificationOptions.map((option, index) => (
              <div className="notification-setting" key={option.title}>
                <div>
                  <strong>{option.title}</strong>
                  <p>{option.description}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={draft.notifications[index]}
                  aria-label={option.title}
                  className={`switch ${draft.notifications[index] ? "on" : ""}`}
                  onClick={() =>
                    preference(
                      "notifications",
                      draft.notifications.map((value, i) =>
                        i === index ? !value : value,
                      ),
                    )
                  }
                >
                  <span />
                </button>
              </div>
            ))}
            <p className="muted text-[10px] mt-3">
              Preferences are stored locally; email, push, and bank alert
              delivery are not connected.
            </p>
          </Card>
          <Card
            id="security"
            title="Security & Data Backup"
            subtitle="Browser storage, portable snapshots, and control over your demo data."
            action={<Badge tone="gray">Local Workspace</Badge>}
          >
            <div className="grid-halves">
              <div className="preference-tile">
                <strong>Local Data Storage</strong>
                <span>
                  Records persist in this browser so you can continue across
                  page reloads. This demo does not encrypt browser storage.
                </span>
                <div className="positive text-[10px] mt-3 flex gap-2 items-center">
                  <Icon name="check_circle" size={13} />
                  Snapshot size:{" "}
                  {(new Blob([JSON.stringify(state)]).size / 1024).toFixed(
                    1,
                  )}{" "}
                  KB
                </div>
              </div>
              <div className="preference-tile">
                <strong>Portable Snapshots</strong>
                <span>
                  Export a human-readable JSON payload containing all financial
                  records and saved preferences.
                </span>
                <div className="flex gap-2 mt-3 flex-wrap">
                  <Button
                    icon="download"
                    onClick={() =>
                      downloadFile(
                        "fintrack-backup.json",
                        JSON.stringify(state, null, 2),
                        "application/json",
                      )
                    }
                  >
                    Export Full Backup (JSON)
                  </Button>
                  <Button
                    icon="file_upload"
                    onClick={() => importRef.current?.click()}
                  >
                    Import Data Archive
                  </Button>
                  <input
                    type="file"
                    accept=".json,application/json"
                    className="hidden"
                    ref={importRef}
                    onChange={(e) => importBackup(e.target.files?.[0])}
                  />
                </div>
              </div>
            </div>
            <div className="danger-zone">
              <div className="flex gap-3 items-center">
                <Icon name="warning" size={24} />
                <div>
                  <strong>Danger Zone: Irreversible Reset</strong>
                  <p>
                    Permanently purge the financial records stored in this
                    browser.
                  </p>
                </div>
              </div>
              <Button
                variant="danger"
                icon="delete"
                onClick={() => setReset(true)}
              >
                Delete Financial Records
              </Button>
            </div>
          </Card>
          <div className="settings-save">
            <p className="muted text-xs">
              <Icon name="info" size={15} />
              {dirty
                ? "You have unsaved changes in your profile, category rules, or preferences."
                : "Your profile, category rules, and preferences are up to date."}
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setDraft(initial);
                  setDraftCategories(state.categories);
                }}
              >
                Cancel
              </Button>
              <Button variant="primary" type="submit" icon="check">
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </form>
      <Modal
        open={category !== undefined}
        onClose={() => setCategory(undefined)}
        title={category ? "Edit Custom Category" : "Add Custom Category"}
      >
        <RecordForm
          fields={[
            { name: "name", label: "Category Name", value: category ?? "" },
          ]}
          onCancel={() => setCategory(undefined)}
          submit="Save Category"
          onSave={(v) => {
            const name = v.name.trim();
            if (
              !name ||
              draftCategories.some(
                (c) => c.toLowerCase() === name.toLowerCase() && c !== category,
              )
            ) {
              notify("Enter a unique category name.");
              return;
            }
            if (category) {
              update((current) => ({
                ...current,
                categories: current.categories.map((c) =>
                  c === category ? name : c,
                ),
                transactions: current.transactions.map((t) =>
                  t.category === category ? { ...t, category: name } : t,
                ),
                budgets: current.budgets.map((b) =>
                  b.name === category ? { ...b, name } : b,
                ),
              }));
              setDraftCategories((current) =>
                current.map((c) => (c === category ? name : c)),
              );
            } else {
              setDraftCategories((current) => [...current, name]);
            }
            setCategory(undefined);
            notify(
              category
                ? "Category renamed across linked records."
                : "Category added. Save changes to keep it.",
            );
          }}
        />
        {category && (
          <Button
            variant="danger"
            icon="delete"
            className="mt-4"
            onClick={() => setDeleteCategory(true)}
          >
            Delete Category
          </Button>
        )}
      </Modal>
      <ConfirmDelete
        open={deleteCategory}
        onClose={() => setDeleteCategory(false)}
        title="Delete category?"
        onConfirm={() => {
          if (
            state.transactions.some((t) => t.category === category) ||
            state.budgets.some((b) => b.name === category)
          ) {
            notify(
              "This category is used by financial records. Rename it instead.",
            );
            return;
          }
          setDraftCategories((current) =>
            current.filter((c) => c !== category),
          );
          setCategory(undefined);
          notify("Category removed. Save changes to keep this change.");
        }}
      />
      <ConfirmDelete
        open={reset}
        onClose={() => setReset(false)}
        title="Delete all financial records?"
        description="This clears all transactions, budgets, investments, loans, deposits, contributions, goals, and reminders from this browser. Export a backup first if you need these records."
        onConfirm={() => {
          update((current) => ({
            ...current,
            transactions: [],
            balances: { cashOpening: 0, ppfOpening: 0 },
            budgets: [],
            holdings: [],
            loans: [],
            deposits: [],
            contributions: [],
            goals: [],
            events: [],
            strategy: null,
          }));
          notify("Financial records deleted from this browser.");
        }}
      />
      <Modal
        open={accounts}
        onClose={() => setAccounts(false)}
        title="Linked Accounts & Channels"
      >
        <p className="muted text-xs mb-5">
          These payment channels belong to the mock ledger. No real account is
          connected.
        </p>
        {Array.from(new Set(state.transactions.map((t) => t.channel))).map(
          (channel) => (
            <div className="summary-row" key={channel}>
              <span className="flex gap-2 items-center">
                <Icon name="account_balance" size={16} />
                {channel}
              </span>
              <Badge tone="gray">Demo</Badge>
            </div>
          ),
        )}
      </Modal>
    </div>
  );
}
