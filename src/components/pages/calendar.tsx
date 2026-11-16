/*
 * src/components/pages/calendar.tsx
 * Combines dashboard obligations with saved reminders in month/week/agenda views. Reminder sources are removed from the dashboard list before combining, avoiding duplicate calendar entries.
 * "use client" marks the browser-interactive entry point: hooks/events or browser APIs
 * need JavaScript after hydration. Next may still prerender its initial HTML on the server.
 * Beginner syntax: @/ means src/ (tsconfig paths); import type is compile-time only.
 */
"use client";
// Use the shared settings-aware amount formatter so saved number formatting applies consistently to this screen.
import { useAmount } from "../use-amount";

// Import React hooks for local state/lifecycle/subscriptions and React types where needed. Hooks run at the component top level; type-only names disappear from the browser JavaScript.
import { useState } from "react";
// Import generated response types from openapi.json. These describe API field shapes to TypeScript; they do not fetch data or validate server JSON at runtime.
import type { DashboardRead, ReminderRead } from "@/types/api";
// Reuse the shared read cache/write flow. useApi supplies reactive request state; successful mutate calls invalidate cached data so subscribed screens refresh.
import { mutate, useApi } from "@/lib/api-cache";
// Reuse URL, HTTP, or error helpers instead of duplicating fetch/parsing rules in this file. Browser /api paths are forwarded by the Next proxy.
import { apiPath, errorMessage } from "@/lib/api-client";
// Reuse decimal/date adapters. Money remains a string at the API boundary; exact totals and display/chart conversion have separate responsibilities.
import { total } from "@/lib/api-format";
// Reuse formatting, local calculator, or download helpers. These utilities do not perform backend writes.
import { dateLabel, downloadFile } from "@/lib/finance";
// Reuse document export helpers that turn current API-derived rows into local downloads.
import { downloadPDF } from "@/lib/export";
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
  Metric,
  Modal,
  PageHeading,
  Tabs,
} from "../ui/primitives";
// Resolve existing design icon names through the shared Lucide mapping, keeping icon rendering consistent.
import { Icon } from "../ui/icon";
// Normalize reminders and dashboard obligations into a common calendar row. The optional reminder keeps the editable backend record only for saved reminders.
interface Event {
  id: string;
  title: string;
  date: string;
  amount: string | null;
  category: string;
  source: string;
  direction: string;
  reminder?: ReminderRead;
}
const style = (category: string) =>
  category.includes("loan") || category.includes("emi")
    ? "event-purple"
    : category.includes("sip") || category.includes("investment")
      ? "event-blue"
      : category.includes("income") || category.includes("maturity")
        ? "event-green"
        : "event-amber";
// Render the Calendar screen. Read API data first, derive display rows, then return JSX; props/state determine which controls and dialogs are visible.
export function Calendar() {
  // Get the shared currency formatter; its settings read is deduplicated by the API cache.
  const amount = useAmount();
  // Destructure shared UI values and setters from FinanceProvider. Object braces select named properties; they do not create independent copies of the underlying state.
  const { month, setMonth, notify } = useFinance();
  // React state stores the calendar layout selection (month/week/agenda). The setter (second array value) schedules a rerender when a control/event changes it; ordinary local variables would reset on each render.
  const [view, setView] = useState("Month");
  // React state stores the active local list/calendar filter. The setter (second array value) schedules a rerender when a control/event changes it; ordinary local variables would reset on each render.
  const [filter, setFilter] = useState("All Events");
  // React state stores the selected calendar day, also used to choose the week view. The setter (second array value) schedules a rerender when a control/event changes it; ordinary local variables would reset on each render.
  const [day, setDay] = useState(22);
  // React state stores the selected calendar date for detail inspection. The setter (second array value) schedules a rerender when a control/event changes it; ordinary local variables would reset on each render.
  const [inspecting, setInspecting] = useState<string>();
  // The editor selection uses three states: undefined closes it, null opens creation, and a record opens editing. This distinction lets one form support both POST and PATCH.
  const [editor, setEditor] = useState<ReminderRead | null | undefined>();
  // Remember the record chosen for deletion so the confirmation dialog can target it. Clearing the selection closes the dialog.
  const [deleting, setDeleting] = useState<ReminderRead>();
  // React state stores which reminder is being updated, so the completion action can show pending state. The setter (second array value) schedules a rerender when a control/event changes it; ordinary local variables would reset on each render.
  const [paying, setPaying] = useState<number>();
  // React state stores a failed calendar write message shown beside the action. The setter (second array value) schedules a rerender when a control/event changes it; ordinary local variables would reset on each render.
  const [writeError, setWriteError] = useState("");
  // Subscribe reminders to this API key. The type inside <...> describes the returned data; loading/error/retry travel with it. A changed URL selects a new cached request, and null skips the read.
  const reminders = useApi<ReminderRead[]>("all:/api/reminders");
  // Subscribe dashboard to this API key. The type inside <...> describes the returned data; loading/error/retry travel with it. A changed URL selects a new cached request, and null skips the read.
  const dashboard = useApi<DashboardRead>(
    apiPath("/api/dashboard", { month: `${month}-01`, as_of: `${month}-01` }),
  );
  // Derive events by retaining only rows that match the conditions below. filter creates a new array and leaves the original API records unchanged.
  const events: Event[] = [
    ...(reminders.data ?? []).map((r) => ({
      id: `reminder-${r.id}`,
      title: r.title,
      date: r.due_date,
      amount: r.amount ?? null,
      category: r.reminder_type ?? "bill",
      source: "reminder",
      direction: "outflow",
      reminder: r,
    })),
    ...(dashboard.data?.upcoming_obligations ?? [])
      // Exclude reminder obligations because full reminder records were already added above; otherwise one saved reminder would appear twice.
      .filter((e) => e.source !== "reminder")
      .map((e) => ({
        id: `${e.source}-${e.source_id}`,
        title: e.title,
        date: e.due_date,
        amount: e.amount,
        category: e.source,
        source: e.source,
        direction: e.direction,
      })),
  ]
    .filter((e) => e.date.startsWith(month))
    .sort((a, b) => a.date.localeCompare(b.date));
  // Derive agenda by retaining only rows that match the conditions below. filter creates a new array and leaves the original API records unchanged.
  const agenda = events.filter(
    (e) =>
      filter === "All Events" ||
      (filter === "EMIs" && e.category.includes("loan")) ||
      (filter === "Investments" && e.category.includes("sip")) ||
      (filter === "Bills" && e.source === "reminder"),
  );
  // Split the shared YYYY-MM string into numeric year/month values. JavaScript Date uses zero-based months, so the following constructor determines whether this means this month or next month.
  const [y, m] = month.split("-").map(Number);
  // Build start from calendar values. JavaScript numeric months are zero-based, so check the adjacent +1/-1 conversions when following the date flow.
  // getDay returns 0 for Sunday through 6 for Saturday. That offset places day one in the correct calendar column.
  const start = new Date(y, m - 1, 1).getDay();
  // Build count from calendar values. JavaScript numeric months are zero-based, so check the adjacent +1/-1 conversions when following the date flow.
  const count = new Date(y, m, 0).getDate();
  // Build cells from calendar values. JavaScript numeric months are zero-based, so check the adjacent +1/-1 conversions when following the date flow.
  // Create whole weeks, including adjacent-month filler days. inMonth lets JSX style those cells differently without changing the seven-column layout.
  const cells = Array.from(
    { length: Math.ceil((start + count) / 7) * 7 },
    (_, i) => {
      // Build d from calendar values. JavaScript numeric months are zero-based, so check the adjacent +1/-1 conversions when following the date flow.
      const d = new Date(y, m - 1, i - start + 1);
      return {
        day: d.getDate(),
        inMonth: d.getMonth() === m - 1,
        date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
      };
    },
  );
  const weekStart = Math.floor((start + Math.min(day, count) - 1) / 7) * 7;
  const shown = view === "Week" ? cells.slice(weekStart, weekStart + 7) : cells;
  const title = dateLabel(`${month}-01`, { month: "long", year: "numeric" });
  // Derive outflow by retaining only rows that match the conditions below. filter creates a new array and leaves the original API records unchanged.
  const outflow = total(
    events
      .filter((e) => e.direction === "outflow" && !e.category.includes("sip"))
      .map((e) => e.amount),
  );
  // Derive sip by retaining only rows that match the conditions below. filter creates a new array and leaves the original API records unchanged.
  const sip = total(
    events.filter((e) => e.category.includes("sip")).map((e) => e.amount),
  );
  // Derive income by retaining only rows that match the conditions below. filter creates a new array and leaves the original API records unchanged.
  const income = total(
    events.filter((e) => e.direction === "inflow").map((e) => e.amount),
  );
  const maturity = events.find((e) => e.category.includes("maturity"));
  // Move the shared calendar month backward/forward using Date month overflow, which also handles year boundaries.
  function shift(direction: number) {
    // Build d from calendar values. JavaScript numeric months are zero-based, so check the adjacent +1/-1 conversions when following the date flow.
    const d = new Date(y, m - 1 + direction, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  // Build an iCalendar file from the current events. Escape reserved characters so titles remain valid calendar text; downloading the file does not sign in to a calendar provider.
  function exportCalendar() {
    // iCalendar reserves backslash, comma, semicolon, and newline; escape them before embedding a title/description so calendar import remains valid.
    const escape = (s: string) =>
      s
        .replaceAll("\\", "\\\\")
        .replaceAll(",", "\\,")
        .replaceAll(";", "\\;")
        .replaceAll("\n", "\\n");
    // Build lines from calendar values. JavaScript numeric months are zero-based, so check the adjacent +1/-1 conversions when following the date flow.
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//FinTrack//Finance Calendar//EN",
      ...events.flatMap((e) => [
        "BEGIN:VEVENT",
        `UID:${e.id}@fintrack.local`,
        `DTSTAMP:${new Date()
          .toISOString()
          .replace(/[-:]/g, "")
          .replace(/\.\d+Z$/, "Z")}`,
        `DTSTART;VALUE=DATE:${e.date.replaceAll("-", "")}`,
        `SUMMARY:${escape(e.title)}`,
        `DESCRIPTION:${escape(`${e.source} - INR ${e.amount ?? "unavailable"}`)}`,
        "END:VEVENT",
      ]),
      "END:VCALENDAR",
    ];
    downloadFile(
      "fintrack-calendar.ics",
      lines.join("\r\n"),
      "text/calendar;charset=utf-8",
    );
    notify("Calendar file exported. Import it into your calendar provider.");
  }
  return (
    <div className="page-stack">
      {/* Page title and primary actions share the same layout classes; callbacks below change state or start an operation when clicked. */}
      <PageHeading
        title="Financial Calendar"
        description="Scheduled loans, SIPs, maturities, and saved reminders"
        actions={
          <>
            <div className="flex items-center gap-1">
              <button
                className="icon-button"
                aria-label="Previous month"
                onClick={() => shift(-1)}
              >
                <Icon name="chevron_left" />
              </button>
              <span className="font-semibold text-xs min-w-28 text-center">
                {title}
              </span>
              <button
                className="icon-button"
                aria-label="Next month"
                onClick={() => shift(1)}
              >
                <Icon name="chevron_right" />
              </button>
            </div>
            <Tabs
              value={view}
              onChange={
                // Switch calendar presentation without creating new events. Month/week/agenda are different views of the same loaded records.
                setView
              }
              items={["Month", "Week", "Agenda"]}
            />
            <Button
              variant="primary"
              icon="add_alert"
              onClick={
                // Select the editor mode: null starts a new record, an existing row edits it, and undefined closes it. The write happens on form submit, not on this click.
                () => setEditor(null)
              }
            >
              Add Reminder
            </Button>
          </>
        }
      />
      {/* Request state belongs here: show initial loading or an error with Retry before treating the following content as successful data. */}
      <ApiBoundary query={reminders}>
        {/* Request state belongs here: show initial loading or an error with Retry before treating the following content as successful data. */}
        <ApiBoundary query={dashboard}>
          <div className="metric-grid">
            <Metric
              label="Scheduled Outflow"
              value={amount(outflow)}
              icon="north_east"
              detail="Loans and reminder amounts"
            />
            <Metric
              label="SIP Investment"
              value={amount(sip)}
              icon="savings"
              detail="Scheduled investment allocations"
            />
            <Metric
              label="Incoming Credits"
              value={amount(income)}
              icon="south_west"
              detail="Scheduled inflows only"
            />
            <Metric
              label="Horizon Maturity"
              value={amount(maturity?.amount)}
              icon="flag"
              detail={maturity?.title ?? "No maturity scheduled in this month"}
            />
          </div>
          <div className="calendar-layout">
            <div className="space-y-5">
              <Card className="!p-0 overflow-hidden">
                <div className="card-heading !mb-0 !p-5">
                  <div>
                    <h2>{title}</h2>
                    <p className="muted text-[10px] mt-1">
                      Click a date to inspect its schedule
                    </p>
                  </div>
                  <div className="flex gap-3 text-[10px] muted flex-wrap">
                    <span>● EMIs</span>
                    <span>● SIPs</span>
                    <span>● Bills</span>
                    <span>● Inflow / Maturity</span>
                  </div>
                </div>
                {/* Turn matching items into JSX with map. Each repeated element needs a stable key so React preserves the right row/control when data changes. */}
                {view === "Agenda" ? (
                  <div className="p-5 space-y-3">
                    {/* Turn matching items into JSX with map. Each repeated element needs a stable key so React preserves the right row/control when data changes. */}
                    {events.length ? (
                      events.map((e) => (
                        <button
                          key={e.id}
                          className={`calendar-agenda-row ${style(e.category)}`}
                          onClick={
                            // Choose a calendar date for the detail dialog, or clear it to close. This is a date string, not a new reminder write.
                            () => setInspecting(e.date)
                          }
                        >
                          <span>
                            {dateLabel(e.date)} · {e.title}
                          </span>
                          <strong>{amount(e.amount)}</strong>
                        </button>
                      ))
                    ) : (
                      <EmptyState text="No scheduled events this month." />
                    )}
                  </div>
                ) : (
                  <div className="calendar-scroll">
                    <div className="calendar-grid">
                      {/* Turn matching items into JSX with map. Each repeated element needs a stable key so React preserves the right row/control when data changes. */}
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                        (d) => (
                          <div className="calendar-day-label" key={d}>
                            {d}
                          </div>
                        ),
                      )}
                      {/* Turn matching items into JSX with map. Each repeated element needs a stable key so React preserves the right row/control when data changes. */}
                      {shown.map((cell) => (
                        <div
                          key={cell.date}
                          className={`calendar-cell ${cell.inMonth ? "" : "outside"}`}
                        >
                          <button
                            className="date-button"
                            aria-label={`Inspect ${cell.date}`}
                            onClick={
                              // Choose a calendar day; the page derives which seven cells to show in week mode.
                              () => {
                                setDay(cell.day);
                                setInspecting(cell.date);
                              }
                            }
                          >
                            {cell.day}
                          </button>
                          {/* Turn matching items into JSX with map. Each repeated element needs a stable key so React preserves the right row/control when data changes. */}
                          {events
                            .filter((e) => e.date === cell.date)
                            .map((e) => (
                              <button
                                key={e.id}
                                className={`calendar-event ${style(e.category)}`}
                                onClick={
                                  // Choose a calendar date for the detail dialog, or clear it to close. This is a date string, not a new reminder write.
                                  () => setInspecting(cell.date)
                                }
                              >
                                <strong>{e.title}</strong>
                                <span>{amount(e.amount)}</span>
                              </button>
                            ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
              <div className="liquidity-card">
                <Icon name="account_balance_wallet" size={25} />
                <div>
                  <h3>Monthly Schedule</h3>
                  <p>
                    Commitments are scheduled amounts, not additional ledger
                    transactions.
                  </p>
                </div>
                <div className="flex gap-2 ml-auto flex-wrap">
                  <Button onClick={exportCalendar}>Sync to Google Cal</Button>
                  <Button
                    onClick={
                      // Build a local download from the currently available API-derived rows. This exports a snapshot; it does not create or update financial records.
                      () =>
                        downloadPDF("fintrack-calendar.pdf", title, [
                          ["Date", "Title", "Amount", "Source"],
                          ...events.map((e) => [
                            e.date,
                            e.title,
                            e.amount ?? "",
                            e.source,
                          ]),
                        ])

                    }
                  >
                    Download PDF
                  </Button>
                </div>
              </div>
            </div>
            {/* Agenda Feed section: the shared Card supplies the existing surface/spacing, while this screen supplies its contents. */}
            <Card
              title="Agenda Feed"
              subtitle="Sorted by scheduled date"
              action={<Badge tone="gray">{events.length} items</Badge>}
            >
              <Tabs
                value={filter}
                onChange={
                  // Change the selected visible group. This screen derives its filtered rows/events from the chosen value on the next render.
                  setFilter
                }
                items={["All Events", "EMIs", "Investments", "Bills"]}
              />
              {/* Conditional JSX: render the following block only when the left-hand condition is truthy; otherwise React leaves it out. */}
              {writeError && (
                <p role="alert" className="api-error mt-4">
                  {writeError}
                </p>
              )}
              <div className="mt-5">
                {/* Turn matching items into JSX with map. Each repeated element needs a stable key so React preserves the right row/control when data changes. */}
                {agenda.length ? (
                  agenda.map((e) => (
                    <div className="agenda-item" key={e.id}>
                      <span className={`entity-icon ${style(e.category)}`}>
                        <Icon
                          name={
                            e.source === "loan"
                              ? "home_work"
                              : e.source === "sip"
                                ? "trending_up"
                                : "calendar_month"
                          }
                        />
                      </span>
                      <div className="flex-1">
                        <div className="flex justify-between gap-2">
                          <strong className="text-xs">{e.title}</strong>
                          <strong className="font-mono text-xs">
                            {amount(e.amount)}
                          </strong>
                        </div>
                        <p className="muted text-[10px] mt-1">
                          {dateLabel(e.date)} ·{" "}
                          {e.category.replaceAll("_", " ")}
                        </p>
                        <div className="flex justify-between items-center gap-2 mt-3">
                          <Badge
                            tone={
                              e.reminder?.status === "completed" ||
                              e.reminder?.status === "paid"
                                ? "green"
                                : "gray"
                            }
                          >
                            {e.reminder?.status ?? "Scheduled"}
                          </Badge>
                          {/* Choose one of two UI branches with condition ? trueBranch : falseBranch. This keeps selected/empty/alternate states in the same layout position. */}
                          {e.reminder ? (
                            <div className="flex gap-1">
                              {/* Conditional JSX: render the following block only when the left-hand condition is truthy; otherwise React leaves it out. */}
                              {e.reminder.status !== "completed" &&
                                e.reminder.status !== "paid" && (
                                  <Button
                                    variant="ghost"
                                    disabled={paying !== undefined}
                                    className="!text-[10px]"
                                    onClick={
                                      // This callback performs a backend write through mutate. Await success before closing/notifying; the shared cache then refreshes active reads, and failures propagate to the visible error handler.
                                      async () => {
                                        setPaying(e.reminder!.id);
                                        setWriteError("");
                                        try {
                                          await mutate(
                                            `/api/reminders/${e.reminder!.id}`,
                                            "PATCH",
                                            { status: "completed" },
                                          );
                                          notify("Reminder marked as paid.");
                                        } catch (error) {
                                          setWriteError(errorMessage(error));
                                        } finally {
                                          setPaying(undefined);
                                        }
                                      }
                                    }
                                  >
                                    {/* Choose one of two UI branches with condition ? trueBranch : falseBranch. This keeps selected/empty/alternate states in the same layout position. */}
                                    {paying === e.reminder.id
                                      ? "Saving…"
                                      : "Mark as Paid"}
                                  </Button>
                                )}
                              <button
                                className="icon-button"
                                aria-label={`Edit ${e.title}`}
                                onClick={
                                  // Select the editor mode: null starts a new record, an existing row edits it, and undefined closes it. The write happens on form submit, not on this click.
                                  () => setEditor(e.reminder)
                                }
                              >
                                <Icon name="edit" size={14} />
                              </button>
                              <button
                                className="icon-button"
                                aria-label={`Delete ${e.title}`}
                                onClick={
                                  // Remember the selected record for a confirmation dialog, or clear it on close. Selecting it alone does not send DELETE.
                                  () => setDeleting(e.reminder)
                                }
                              >
                                <Icon name="delete" size={14} />
                              </button>
                            </div>
                          ) : (
                            <span className="muted text-[10px]">
                              Manage in source module
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState text="No events in this selection." />
                )}
              </div>
            </Card>
          </div>
        </ApiBoundary>
      </ApiBoundary>
      {/* The parent owns open/close state; Modal handles the native dialog and scroll cleanup. Content is only mounted while open. */}
      <Modal
        open={Boolean(inspecting)}
        title={
          inspecting
            ? dateLabel(inspecting, {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })
            : "Date details"
        }
        onClose={
          // Choose a calendar date for the detail dialog, or clear it to close. This is a date string, not a new reminder write.
          () => setInspecting(undefined)
        }
      >
        {/* Turn matching items into JSX with map. Each repeated element needs a stable key so React preserves the right row/control when data changes. */}
        {events.filter((e) => e.date === inspecting).length ? (
          events
            .filter((e) => e.date === inspecting)
            .map((e) => (
              <div className="summary-row" key={e.id}>
                <span>{e.title}</span>
                <strong>{amount(e.amount)}</strong>
              </div>
            ))
        ) : (
          <EmptyState text="No dues on this date." />
        )}
        <div className="modal-footer">
          <Button
            variant="primary"
            onClick={
              // Select the editor mode: null starts a new record, an existing row edits it, and undefined closes it. The write happens on form submit, not on this click.
              () => {
                setEditor(null);
                setInspecting(undefined);
              }
            }
          >
            Add Reminder
          </Button>
        </div>
      </Modal>
      {/* Conditional JSX: render the following block only when the left-hand condition is truthy; otherwise React leaves it out. */}
      {editor !== undefined && (
        <ResourceEditor
          path="/api/reminders"
          record={editor ?? undefined}
          title={editor ? "Edit Financial Reminder" : "New Financial Reminder"}
          defaults={{
            due_date: `${month}-${String(Math.min(day, count)).padStart(2, "0")}`,
            status: "pending",
            reminder_type: "bill",
          }}
          onClose={
            // Select the editor mode: null starts a new record, an existing row edits it, and undefined closes it. The write happens on form submit, not on this click.
            () => setEditor(undefined)
          }
        />
      )}
      {/* Keep destructive writes behind confirmation. The callback awaits DELETE; failures stay in the dialog and a successful 204 has no JSON body. */}
      <ConfirmDelete
        key={deleting?.id ?? "none"}
        open={Boolean(deleting)}
        onClose={
          // Remember the selected record for a confirmation dialog, or clear it on close. Selecting it alone does not send DELETE.
          () => setDeleting(undefined)
        }
        onConfirm={
          // This callback performs a backend write through mutate. Await success before closing/notifying; the shared cache then refreshes active reads, and failures propagate to the visible error handler.
          async () => {
            if (deleting) await mutate(`/api/reminders/${deleting.id}`, "DELETE");
          }
        }
      />
    </div>
  );
}
