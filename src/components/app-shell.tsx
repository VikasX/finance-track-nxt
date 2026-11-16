"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { navigation } from "@/lib/navigation";
import { useFinance } from "./finance-provider";
import { Icon } from "./ui/icon";
import { Button } from "./ui/primitives";
import { TransactionEditor } from "./transaction-editor";
import { dateLabel } from "@/lib/finance";
import { useApi, useDebounced } from "@/lib/api-cache";
import { apiPath, errorMessage } from "@/lib/api-client";
import type {
  SettingsRead,
  PageResult,
  TransactionRead,
  ReminderRead,
} from "@/types/api";
import { useAmount } from "./use-amount";
import { ThemeControl } from "./theme-control";
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const money = useAmount();
  const { month, setMonth, transactionOpen, setTransactionOpen } = useFinance();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [notifications, setNotifications] = useState(false);
  const settings = useApi<SettingsRead>("/api/settings");
  const settledSearch = useDebounced(search);
  const searchQuery = useApi<PageResult<TransactionRead>>(
    settledSearch.trim().length >= 2
      ? apiPath("/api/transactions", { search: settledSearch, page_size: 5 })
      : null,
  );
  const reminders = useApi<PageResult<ReminderRead>>(
    notifications
      ? "/api/reminders/upcoming?as_of=2024-11-01&days=30&include_overdue=true"
      : null,
  );
  const state = {
    preferences: {
      name: settings.data?.profile.name ?? "Profile",
      email: settings.data?.profile.email ?? "",
      avatar: "",
    },
    events: (reminders.data?.items ?? []).map((event) => ({
      id: event.id,
      title: event.title,
      date: event.due_date,
      amount: event.amount == null ? null : Number(event.amount),
      paid: false,
    })),
  };
  const matches = (searchQuery.data?.items ?? []).map((item) => ({
    id: item.id,
    name: item.description,
    date: item.transaction_date,
    amount: Number(item.amount),
  }));
  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      {mobileOpen && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <Link
          href="/dashboard"
          className="brand"
          onClick={() => setMobileOpen(false)}
        >
          <div className="brand-symbol">
            <Icon name="monitoring" size={22} />
          </div>
          <span>FinTrack</span>
          <span className="pro-badge">PRO</span>
        </Link>
        <nav aria-label="Main navigation">
          {navigation.map((group) => (
            <div className="nav-group" key={group.group}>
              <div className="nav-label">{group.group}</div>
              {group.items.map((item) => (
                <Link
                  href={item.href}
                  key={item.href}
                  aria-current={
                    pathname === item.href ||
                    (pathname === "/" && item.href === "/dashboard")
                      ? "page"
                      : undefined
                  }
                  className={`nav-item ${pathname === item.href || (pathname === "/" && item.href === "/dashboard") ? "active" : ""}`}
                  onClick={() => setMobileOpen(false)}
                >
                  <Icon name={item.icon} size={18} />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>
      </aside>
      <div className="app-main">
        <header className="app-header">
          <button
            aria-label="Open navigation"
            className="icon-button mobile-menu"
            onClick={() => setMobileOpen(true)}
          >
            <Icon name="menu" />
          </button>
          <div className="header-search">
            <Icon name="search" size={18} />
            <input
              aria-label="Search transactions, assets, ledgers"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search transactions, assets, ledgers..."
            />
            {search && (
              <div className="search-results">
                {matches.length ? (
                  matches.map((item) => (
                    <Link
                      key={item.id}
                      href={`/income-expenses?q=${encodeURIComponent(item.name)}`}
                      onClick={() => setSearch("")}
                    >
                      <span>
                        {item.name}
                        <small>{dateLabel(item.date)}</small>
                      </span>
                      <strong>{money(item.amount)}</strong>
                    </Link>
                  ))
                ) : (
                  <p>
                    {searchQuery.error
                      ? errorMessage(searchQuery.error)
                      : searchQuery.loading && settledSearch.length >= 2
                        ? "Searching…"
                        : search.length < 2
                          ? "Enter at least two characters."
                          : "No matching transactions."}
                  </p>
                )}
              </div>
            )}
          </div>
          <label className="header-month">
            <Icon name="calendar_month" size={16} />
            <input
              aria-label="Selected month"
              type="month"
              value={month}
              onChange={(event) => {
                if (event.target.value) setMonth(event.target.value);
              }}
            />
          </label>
          <div className="header-right">
            <ThemeControl />
            <div className="relative">
              <button
                className="icon-button notification-button"
                aria-label="Notifications"
                aria-expanded={notifications}
                onClick={() => setNotifications(!notifications)}
              >
                <Icon name="notifications" size={21} />
                <i />
              </button>
              {notifications && (
                <div className="notification-panel">
                  <strong>Upcoming reminders</strong>
                  {reminders.error && (
                    <p role="alert">
                      {errorMessage(reminders.error)}{" "}
                      <button onClick={reminders.retry}>Retry</button>
                    </p>
                  )}
                  {reminders.loading && <p>Loading…</p>}
                  {state.events
                    .filter((event) => !event.paid)
                    .slice(0, 4)
                    .map((event) => (
                      <Link
                        href="/calendar"
                        key={event.id}
                        onClick={() => setNotifications(false)}
                      >
                        <span>{event.title}</span>
                        <small>
                          {dateLabel(event.date)} ·{" "}
                          {event.amount == null ? "—" : money(event.amount)}
                        </small>
                      </Link>
                    ))}
                </div>
              )}
            </div>
            <Button
              variant="primary"
              icon="add"
              onClick={() => setTransactionOpen(true)}
            >
              <span className="add-transaction-label">Add Transaction</span>
            </Button>
            <Link
              href="/settings"
              className="profile"
              aria-label="Profile settings"
            >
              {state.preferences.avatar ? (
                <Image
                  src={state.preferences.avatar}
                  alt="Profile"
                  width={34}
                  height={34}
                  unoptimized
                />
              ) : (
                <span className="avatar">
                  {state.preferences.name
                    .split(" ")
                    .map((word) => word[0])
                    .slice(0, 2)
                    .join("")}
                </span>
              )}
              <span className="profile-text">
                <strong>{state.preferences.name}</strong>
                <small>{state.preferences.email}</small>
              </span>
              <Icon name="expand_more" size={16} />
            </Link>
          </div>
        </header>
        <main id="main-content" className="page-content">
          {children}
        </main>
      </div>
      {transactionOpen && (
        <TransactionEditor open onClose={() => setTransactionOpen(false)} />
      )}
    </>
  );
}
