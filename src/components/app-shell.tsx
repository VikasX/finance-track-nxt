"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { navigation } from "@/lib/mock-data";
import { useFinance } from "./finance-provider";
import { Icon } from "./ui/icon";
import { Button } from "./ui/primitives";
import { TransactionEditor } from "./transaction-editor";
import { dateLabel, money } from "@/lib/finance";
import { ThemeControl } from "./theme-control";
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { state, month, setMonth, transactionOpen, setTransactionOpen } =
    useFinance();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [notifications, setNotifications] = useState(false);
  const matches = search.trim()
    ? state.transactions
        .filter((item) =>
          `${item.name} ${item.category}`
            .toLowerCase()
            .includes(search.toLowerCase()),
        )
        .slice(0, 5)
    : [];
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
                  <p>No matching transactions.</p>
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
                          {dateLabel(event.date)} · {money(event.amount)}
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
