"use client";
import { useAmount } from "../use-amount";

import { useState } from "react";
import type { DashboardRead, ReminderRead } from "@/types/api";
import { mutate, useApi } from "@/lib/api-cache";
import { apiPath, errorMessage } from "@/lib/api-client";
import { total } from "@/lib/api-format";
import { dateLabel, downloadFile } from "@/lib/finance";
import { downloadPDF } from "@/lib/export";
import { useFinance } from "../finance-provider";
import { ResourceEditor } from "../resource-editor";
import { ApiBoundary } from "../ui/api-boundary";
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
import { Icon } from "../ui/icon";
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
export function Calendar() {
  const amount = useAmount();
  const { month, setMonth, notify } = useFinance();
  const [view, setView] = useState("Month");
  const [filter, setFilter] = useState("All Events");
  const [day, setDay] = useState(22);
  const [inspecting, setInspecting] = useState<string>();
  const [editor, setEditor] = useState<ReminderRead | null | undefined>();
  const [deleting, setDeleting] = useState<ReminderRead>();
  const [paying, setPaying] = useState<number>();
  const [writeError, setWriteError] = useState("");
  const reminders = useApi<ReminderRead[]>("all:/api/reminders");
  const dashboard = useApi<DashboardRead>(
    apiPath("/api/dashboard", { month: `${month}-01`, as_of: `${month}-01` }),
  );
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
  const agenda = events.filter(
    (e) =>
      filter === "All Events" ||
      (filter === "EMIs" && e.category.includes("loan")) ||
      (filter === "Investments" && e.category.includes("sip")) ||
      (filter === "Bills" && e.source === "reminder"),
  );
  const [y, m] = month.split("-").map(Number);
  const start = new Date(y, m - 1, 1).getDay();
  const count = new Date(y, m, 0).getDate();
  const cells = Array.from(
    { length: Math.ceil((start + count) / 7) * 7 },
    (_, i) => {
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
  const outflow = total(
    events
      .filter((e) => e.direction === "outflow" && !e.category.includes("sip"))
      .map((e) => e.amount),
  );
  const sip = total(
    events.filter((e) => e.category.includes("sip")).map((e) => e.amount),
  );
  const income = total(
    events.filter((e) => e.direction === "inflow").map((e) => e.amount),
  );
  const maturity = events.find((e) => e.category.includes("maturity"));
  function shift(direction: number) {
    const d = new Date(y, m - 1 + direction, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  function exportCalendar() {
    const escape = (s: string) =>
      s
        .replaceAll("\\", "\\\\")
        .replaceAll(",", "\\,")
        .replaceAll(";", "\\;")
        .replaceAll("\n", "\\n");
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
              onChange={setView}
              items={["Month", "Week", "Agenda"]}
            />
            <Button
              variant="primary"
              icon="add_alert"
              onClick={() => setEditor(null)}
            >
              Add Reminder
            </Button>
          </>
        }
      />
      <ApiBoundary query={reminders}>
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
                {view === "Agenda" ? (
                  <div className="p-5 space-y-3">
                    {events.length ? (
                      events.map((e) => (
                        <button
                          key={e.id}
                          className={`calendar-agenda-row ${style(e.category)}`}
                          onClick={() => setInspecting(e.date)}
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
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                        (d) => (
                          <div className="calendar-day-label" key={d}>
                            {d}
                          </div>
                        ),
                      )}
                      {shown.map((cell) => (
                        <div
                          key={cell.date}
                          className={`calendar-cell ${cell.inMonth ? "" : "outside"}`}
                        >
                          <button
                            className="date-button"
                            aria-label={`Inspect ${cell.date}`}
                            onClick={() => {
                              setDay(cell.day);
                              setInspecting(cell.date);
                            }}
                          >
                            {cell.day}
                          </button>
                          {events
                            .filter((e) => e.date === cell.date)
                            .map((e) => (
                              <button
                                key={e.id}
                                className={`calendar-event ${style(e.category)}`}
                                onClick={() => setInspecting(cell.date)}
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
                    onClick={() =>
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
            <Card
              title="Agenda Feed"
              subtitle="Sorted by scheduled date"
              action={<Badge tone="gray">{events.length} items</Badge>}
            >
              <Tabs
                value={filter}
                onChange={setFilter}
                items={["All Events", "EMIs", "Investments", "Bills"]}
              />
              {writeError && (
                <p role="alert" className="api-error mt-4">
                  {writeError}
                </p>
              )}
              <div className="mt-5">
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
                          {e.reminder ? (
                            <div className="flex gap-1">
                              {e.reminder.status !== "completed" &&
                                e.reminder.status !== "paid" && (
                                  <Button
                                    variant="ghost"
                                    disabled={paying !== undefined}
                                    className="!text-[10px]"
                                    onClick={async () => {
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
                                    }}
                                  >
                                    {paying === e.reminder.id
                                      ? "Saving…"
                                      : "Mark as Paid"}
                                  </Button>
                                )}
                              <button
                                className="icon-button"
                                aria-label={`Edit ${e.title}`}
                                onClick={() => setEditor(e.reminder)}
                              >
                                <Icon name="edit" size={14} />
                              </button>
                              <button
                                className="icon-button"
                                aria-label={`Delete ${e.title}`}
                                onClick={() => setDeleting(e.reminder)}
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
        onClose={() => setInspecting(undefined)}
      >
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
            onClick={() => {
              setEditor(null);
              setInspecting(undefined);
            }}
          >
            Add Reminder
          </Button>
        </div>
      </Modal>
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
          onClose={() => setEditor(undefined)}
        />
      )}
      <ConfirmDelete
        key={deleting?.id ?? "none"}
        open={Boolean(deleting)}
        onClose={() => setDeleting(undefined)}
        onConfirm={async () => {
          if (deleting) await mutate(`/api/reminders/${deleting.id}`, "DELETE");
        }}
      />
    </div>
  );
}
