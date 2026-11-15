"use client";
import { useState } from "react";
import { useFinance } from "../finance-provider";
import { dateLabel, downloadFile, money, sum, uid } from "@/lib/finance";
import { downloadPDF } from "@/lib/export";
import type { FinancialEvent } from "@/types/finance";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Metric,
  Modal,
  PageHeading,
  RecordForm,
  Tabs,
} from "../ui/primitives";
import { Icon } from "../ui/icon";
const eventStyle = (category: FinancialEvent["category"]) =>
  category === "EMI / Loan"
    ? "event-purple"
    : category === "SIP / Mutual Fund"
      ? "event-blue"
      : category === "Income" || category === "Maturity"
        ? "event-green"
        : "event-amber";
const eventIcon = (category: FinancialEvent["category"]) =>
  category === "EMI / Loan"
    ? "home_work"
    : category === "SIP / Mutual Fund"
      ? "trending_up"
      : category === "Income"
        ? "credit_card"
        : "bolt";
export function Calendar() {
  const { state, month, setMonth, update, notify } = useFinance();
  const [view, setView] = useState("Month");
  const [filter, setFilter] = useState("All Events");
  const [day, setDay] = useState(22);
  const [inspecting, setInspecting] = useState<string>();
  const [reminder, setReminder] = useState<FinancialEvent | null | undefined>();
  const [year, monthIndex] = month.split("-").map(Number);
  const first = new Date(year, monthIndex - 1, 1);
  const count = new Date(year, monthIndex, 0).getDate();
  const start = first.getDay();
  const cells = Array.from(
    { length: Math.ceil((start + count) / 7) * 7 },
    (_, index) => {
      const date = new Date(year, monthIndex - 1, index - start + 1);
      return {
        day: date.getDate(),
        inMonth: date.getMonth() === monthIndex - 1,
        date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
      };
    },
  );
  const events = state.events
    .filter((e) => e.date.startsWith(month))
    .sort((a, b) => a.date.localeCompare(b.date));
  const agenda = events.filter(
    (e) =>
      filter === "All Events" ||
      (filter === "EMIs"
        ? e.category === "EMI / Loan"
        : filter === "Investments"
          ? e.category === "SIP / Mutual Fund"
          : e.category === "Utility Bill"),
  );
  const outflow = sum(
    events.filter(
      (e) => !["Income", "Maturity", "SIP / Mutual Fund"].includes(e.category),
    ),
    (e) => e.amount,
  );
  const incoming = sum(
    events.filter((e) => ["Income", "Maturity"].includes(e.category)),
    (e) => e.amount,
  );
  const sip = sum(
    events.filter((e) => e.category === "SIP / Mutual Fund"),
    (e) => e.amount,
  );
  const title = dateLabel(`${month}-01`, { month: "long", year: "numeric" });
  const weekStart = Math.floor((start + Math.min(day, count) - 1) / 7) * 7;
  const visibleCells =
    view === "Week" ? cells.slice(weekStart, weekStart + 7) : cells;
  function shiftMonth(direction: number) {
    const next = new Date(year, monthIndex - 1 + direction, 1);
    setMonth(
      `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`,
    );
  }
  function calendarFile() {
    const escape = (v: string) =>
      v
        .replaceAll("\\", "\\\\")
        .replaceAll(",", "\\,")
        .replaceAll(";", "\\;")
        .replaceAll("\n", "\\n");
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//FinTrack//Financial Calendar//EN",
      ...events.flatMap((e) => [
        "BEGIN:VEVENT",
        `UID:${e.id}@fintrack.local`,
        "DTSTAMP:20241022T000000Z",
        `DTSTART;VALUE=DATE:${e.date.replaceAll("-", "")}`,
        `SUMMARY:${escape(e.title)}`,
        `DESCRIPTION:${escape(`${e.description} - INR ${e.amount}`)}`,
        "END:VEVENT",
      ]),
      "END:VCALENDAR",
    ];
    downloadFile(
      "fintrack-calendar.ics",
      lines.join("\r\n"),
      "text/calendar;charset=utf-8",
    );
    notify(
      "Calendar file downloaded. Import it into Google Calendar to sync these reminders.",
    );
  }
  return (
    <div className="page-stack">
      <PageHeading
        title="Financial Calendar"
        badge="Q4 Demo Schedule"
        description="Scheduled EMIs, SIPs, recurring subscriptions, and maturity events"
        actions={
          <>
            <div className="flex items-center gap-1">
              <button
                className="icon-button"
                aria-label="Previous month"
                onClick={() => shiftMonth(-1)}
              >
                <Icon name="chevron_left" />
              </button>
              <span className="font-semibold text-xs min-w-28 text-center">
                {title}
              </span>
              <button
                className="icon-button"
                aria-label="Next month"
                onClick={() => shiftMonth(1)}
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
              onClick={() => setReminder(null)}
            >
              Add Reminder
            </Button>
          </>
        }
      />
      <div className="metric-grid">
        <Metric
          label="Scheduled Outflow"
          value={money(outflow)}
          icon="north_east"
          detail={`${events.filter((e) => !["Income", "Maturity", "SIP / Mutual Fund"].includes(e.category)).length} recurring liabilities`}
        />
        <Metric
          label="SIP Investment"
          value={money(sip)}
          icon="savings"
          detail={`${events.filter((e) => e.category === "SIP / Mutual Fund").length} automated funds`}
        />
        <Metric
          label="Incoming Credits"
          value={money(incoming)}
          icon="south_west"
          detail="Expected income and maturity credits"
        />
        <Metric
          label="Next Horizon Maturity"
          value="+₹1,07,609"
          icon="flag"
          detail="Axis FD · 15 Nov 2024"
          tone="positive"
        />
      </div>
      <div className="calendar-layout">
        <div className="space-y-5">
          <Card className="!p-0 overflow-hidden">
            <div className="card-heading !mb-0 !p-5">
              <div>
                <h2>{title}</h2>
                <p className="muted text-[10px] mt-1">
                  Click any date to inspect transactions
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-[10px] muted">
                {[
                  { label: "EMI Due", color: "#7c3aed" },
                  { label: "SIPs", color: "#6686dc" },
                  { label: "Utilities", color: "#d99300" },
                  { label: "Inflow/Maturity", color: "#007650" },
                ].map((item) => (
                  <span key={item.label} className="flex gap-1 items-center">
                    <i
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: item.color }}
                    />
                    {item.label}
                  </span>
                ))}
              </div>
            </div>
            {view === "Agenda" ? (
              <div className="p-5 space-y-3">
                {events.length ? (
                  events.map((event) => (
                    <button
                      className={`calendar-agenda-row ${eventStyle(event.category)}`}
                      key={event.id}
                      onClick={() => setInspecting(event.date)}
                    >
                      <span>
                        {dateLabel(event.date)} · {event.title}
                      </span>
                      <strong className="font-mono">
                        {money(event.amount)}
                      </strong>
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
                    (day) => (
                      <div key={day} className="calendar-day-label">
                        {day}
                      </div>
                    ),
                  )}
                  {visibleCells.map((cell) => (
                    <div
                      className={`calendar-cell ${!cell.inMonth ? "outside" : ""} ${cell.date === "2024-10-22" ? "today" : ""}`}
                      key={cell.date}
                    >
                      <button
                        className="date-button"
                        aria-label={`Inspect ${cell.date}`}
                        onClick={() => {
                          setDay(cell.day);
                          setInspecting(cell.date);
                        }}
                      >
                        <span>{cell.day}</span>
                        {cell.date === "2024-10-22" && <small>Today</small>}
                      </button>
                      {events
                        .filter((event) => event.date === cell.date)
                        .map((event) => (
                          <button
                            className={`calendar-event ${eventStyle(event.category)}`}
                            key={event.id}
                            onClick={() => {
                              setDay(cell.day);
                              setInspecting(cell.date);
                            }}
                          >
                            <strong>{event.title}</strong>
                            <span>
                              {event.category === "Income" ||
                              event.category === "Maturity"
                                ? "+"
                                : ""}
                              {money(event.amount)}
                            </span>
                          </button>
                        ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
          <div className="info-strip purple">
            <Icon name="flag" />
            <div className="flex-1">
              <strong className="text-xs">
                Upcoming Maturity: Axis FD · 15 Nov 2024
              </strong>
              <p className="text-[10px] mt-1">
                12-Month Fixed Deposit matures into Primary Account · Renewal
                window open
              </p>
            </div>
            <Button
              variant="ghost"
              onClick={() =>
                downloadPDF(
                  "axis-fd-summary.pdf",
                  "Axis Fixed Deposit Summary",
                  [
                    ["Principal", 100000],
                    ["Rate", "7.4%"],
                    ["Maturity", "15 Nov 2024"],
                  ],
                )
              }
            >
              View Certificate
            </Button>
          </div>
          <div className="liquidity-card">
            <Icon name="account_balance_wallet" size={25} />
            <div>
              <h3>Monthly Liquidity Buffer</h3>
              <p>
                Projected month-end surplus after schedule deductions:{" "}
                <strong>{money(incoming - outflow - sip)}</strong>
              </p>
            </div>
            <div className="flex gap-2 ml-auto flex-wrap">
              <Button onClick={calendarFile}>Sync to Google Cal</Button>
              <Button
                onClick={() =>
                  downloadPDF("fintrack-calendar.pdf", title, [
                    ["Date", "Event", "Amount", "Status"],
                    ...events.map((e) => [
                      e.date,
                      e.title,
                      e.amount,
                      e.paid ? "Completed" : "Pending",
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
          subtitle="Sorted by chronological priority"
          action={<Badge tone="gray">{agenda.length} items</Badge>}
        >
          <div className="info-strip !text-[10px] mb-4">
            Pending Outflows{" "}
            <strong>
              {money(
                sum(
                  events.filter(
                    (e) =>
                      !e.paid && !["Income", "Maturity"].includes(e.category),
                  ),
                  (e) => e.amount,
                ),
              )}
            </strong>
          </div>
          <Tabs
            value={filter}
            onChange={setFilter}
            items={["All Events", "EMIs", "Investments", "Bills"]}
          />
          <div className="mt-5">
            {agenda.length ? (
              agenda.map((event) => (
                <div className="agenda-item" key={event.id}>
                  <span className={`entity-icon ${eventStyle(event.category)}`}>
                    <Icon name={eventIcon(event.category)} />
                  </span>
                  <div className="flex-1">
                    <div className="flex justify-between gap-2">
                      <strong className="text-xs">{event.title}</strong>
                      <strong
                        className={`font-mono text-xs ${["Income", "Maturity"].includes(event.category) ? "positive" : ""}`}
                      >
                        {money(event.amount)}
                      </strong>
                    </div>
                    <p className="muted text-[10px] mt-1">
                      {dateLabel(event.date)} · {event.description}
                    </p>
                    <div className="flex justify-between items-center mt-3">
                      <Badge tone={event.paid ? "green" : "amber"}>
                        {event.paid ? "Completed" : "Scheduled"}
                      </Badge>
                      {!event.paid &&
                      !["Income", "Maturity"].includes(event.category) ? (
                        <Button
                          variant="ghost"
                          className="!text-[10px]"
                          onClick={() => {
                            update((current) => ({
                              ...current,
                              events: current.events.map((e) =>
                                e.id === event.id ? { ...e, paid: true } : e,
                              ),
                            }));
                            notify("Reminder marked as paid.");
                          }}
                        >
                          Mark as Paid
                        </Button>
                      ) : (
                        <span className="muted text-[10px]">
                          {event.autoDebit ? "Auto-debit" : "Manual"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState text="No events in this category." />
            )}
          </div>
          <div className="info-strip green mt-5 !block">
            <strong className="text-xs">Auto-Debit Funding Source</strong>
            <p className="text-[10px] mt-2">HDFC Salary Acc (••4190)</p>
            <strong className="font-mono block mt-2">₹86,420</strong>
            <p className="text-[10px] mt-2">
              Illustrative account balance. No bank connection is active.
            </p>
          </div>
        </Card>
      </div>
      <Modal
        open={Boolean(inspecting)}
        onClose={() => setInspecting(undefined)}
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
      >
        {state.events.filter((e) => e.date === inspecting).length ? (
          state.events
            .filter((e) => e.date === inspecting)
            .map((event) => (
              <div key={event.id} className="summary-row">
                <div>
                  <strong>{event.title}</strong>
                  <p className="muted text-xs">{event.description}</p>
                  <Badge tone={event.paid ? "green" : "amber"}>
                    {event.paid ? "Completed" : "Scheduled"}
                  </Badge>
                </div>
                <div className="text-right">
                  <strong>{money(event.amount)}</strong>
                  <div>
                    <Button
                      variant="ghost"
                      icon="edit"
                      onClick={() => {
                        setReminder(event);
                        setInspecting(undefined);
                      }}
                    >
                      Edit
                    </Button>
                  </div>
                </div>
              </div>
            ))
        ) : (
          <EmptyState text="No dues on this date." />
        )}
        <div className="modal-footer">
          <Button
            variant="primary"
            icon="add"
            onClick={() => {
              setReminder(null);
              setInspecting(undefined);
            }}
          >
            Add Reminder
          </Button>
        </div>
      </Modal>
      <Modal
        open={reminder !== undefined}
        onClose={() => setReminder(undefined)}
        title={reminder ? "Edit Financial Reminder" : "New Financial Reminder"}
      >
        <RecordForm
          fields={[
            { name: "title", label: "Reminder Title", value: reminder?.title },
            {
              name: "amount",
              label: "Amount (₹)",
              type: "number",
              min: 0.01,
              value: reminder?.amount,
            },
            {
              name: "date",
              label: "Due Date",
              type: "date",
              value:
                reminder?.date ??
                `${month}-${String(Math.min(day, count)).padStart(2, "0")}`,
            },
            {
              name: "category",
              label: "Category",
              type: "select",
              options: [
                "EMI / Loan",
                "SIP / Mutual Fund",
                "Utility Bill",
                "Insurance",
                "Subscription",
                "Income",
                "Maturity",
              ],
              value: reminder?.category,
            },
            {
              name: "autoDebit",
              label: "Enabled via bank Auto-Debit mandate",
              type: "checkbox",
              value: reminder?.autoDebit,
            },
          ]}
          onCancel={() => setReminder(undefined)}
          submit="Set Reminder"
          onSave={(v) => {
            const record: FinancialEvent = {
              id: reminder?.id ?? uid(),
              title: v.title,
              amount: Number(v.amount),
              date: v.date,
              category: v.category as FinancialEvent["category"],
              paid: reminder?.paid ?? false,
              autoDebit: v.autoDebit === "on",
              description:
                reminder?.description ?? "Personal financial reminder",
            };
            update((current) => ({
              ...current,
              events: reminder
                ? current.events.map((e) => (e.id === reminder.id ? record : e))
                : [...current.events, record],
            }));
            notify("Financial reminder saved.");
            setReminder(undefined);
          }}
        />
      </Modal>
    </div>
  );
}
