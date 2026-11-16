/*
 * src/components/app-shell.tsx
 * The persistent sidebar, header, global search, reminder panel, and Add Transaction dialog. RootLayout passes the active route as children, which appears inside this shared frame.
 * "use client" marks the browser-interactive entry point: hooks/events or browser APIs
 * need JavaScript after hydration. Next may still prerender its initial HTML on the server.
 * Beginner syntax: @/ means src/ (tsconfig paths); import type is compile-time only.
 */
"use client";
// Use the Next image component for the existing image assets and image sizing behavior.
import Image from "next/image";
// Use Next Link for in-app navigation so moving between routes can reuse the app shell instead of doing a full document reload.
import Link from "next/link";
// Use App Router navigation helpers to read the active URL or redirect. URL state is separate from local useState values.
import { usePathname } from "next/navigation";
// Import React hooks for local state/lifecycle/subscriptions and React types where needed. Hooks run at the component top level; type-only names disappear from the browser JavaScript.
import { useState, type ReactNode } from "react";
// Import the sidebar link groups. AppShell maps this data to links and compares each href with the active pathname.
import { navigation } from "@/lib/navigation";
// Read shared UI context for the selected month, global transaction dialog, or toast messages. Financial records still come from API hooks.
import { useFinance } from "./finance-provider";
// Resolve existing design icon names through the shared Lucide mapping, keeping icon rendering consistent.
import { Icon } from "./ui/icon";
// Import the shared styled UI pieces rather than repeating button/card/dialog/form markup. Their props let this screen supply content and event callbacks.
import { Button } from "./ui/primitives";
// Reuse the category-aware transaction form wrapper for creation/editing rather than rebuilding request fields here.
import { TransactionEditor } from "./transaction-editor";
// Reuse formatting, local calculator, or download helpers. These utilities do not perform backend writes.
import { dateLabel } from "@/lib/finance";
// Reuse the shared read cache/write flow. useApi supplies reactive request state; successful mutate calls invalidate cached data so subscribed screens refresh.
import { useApi, useDebounced } from "@/lib/api-cache";
// Reuse URL, HTTP, or error helpers instead of duplicating fetch/parsing rules in this file. Browser /api paths are forwarded by the Next proxy.
import { apiPath, errorMessage } from "@/lib/api-client";
// Import generated response types from openapi.json. These describe API field shapes to TypeScript; they do not fetch data or validate server JSON at runtime.
import type {
  SettingsRead,
  PageResult,
  TransactionRead,
  ReminderRead,
} from "@/types/api";
// Use the shared settings-aware amount formatter so saved number formatting applies consistently to this screen.
import { useAmount } from "./use-amount";
// Use the shared appearance selector rather than creating another light/dark state in this screen.
import { ThemeControl } from "./theme-control";
// Receives children from RootLayout and surrounds it with navigation. Local booleans control menus/panels; useApi supplies remote profile, search, and reminder results.
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const money = useAmount();
  // Destructure shared UI values and setters from FinanceProvider. Object braces select named properties; they do not create independent copies of the underlying state.
  const { month, setMonth, transactionOpen, setTransactionOpen } = useFinance();
  // React state stores whether the narrow-screen sidebar drawer is visible. The setter (second array value) schedules a rerender when a control/event changes it; ordinary local variables would reset on each render.
  const [mobileOpen, setMobileOpen] = useState(false);
  // React state stores the input text immediately, before its debounced value triggers a server search. The setter (second array value) schedules a rerender when a control/event changes it; ordinary local variables would reset on each render.
  const [search, setSearch] = useState("");
  // React state stores whether the reminders popover is open, enabling its lazy API read. The setter (second array value) schedules a rerender when a control/event changes it; ordinary local variables would reset on each render.
  const [notifications, setNotifications] = useState(false);
  // Subscribe settings to this API key. The type inside <...> describes the returned data; loading/error/retry travel with it. A changed URL selects a new cached request, and null skips the read.
  const settings = useApi<SettingsRead>("/api/settings");
  // Only the settled search text triggers a remote lookup; the immediate search state still updates the input on every keystroke.
  const settledSearch = useDebounced(search);
  // Subscribe searchQuery to this API key. The type inside <...> describes the returned data; loading/error/retry travel with it. A changed URL selects a new cached request, and null skips the read.
  const searchQuery = useApi<PageResult<TransactionRead>>(
    settledSearch.trim().length >= 2
      ? apiPath("/api/transactions", { search: settledSearch, page_size: 5 })
      : null,
  );
  // Subscribe reminders to this API key. The type inside <...> describes the returned data; loading/error/retry travel with it. A changed URL selects a new cached request, and null skips the read.
  const reminders = useApi<PageResult<ReminderRead>>(
    notifications
      ? "/api/reminders/upcoming?as_of=2024-11-01&days=30&include_overdue=true"
      : null,
  );
  // Adapt API profile/reminder fields to the shell presentation. This is derived on render, not a second saved financial store.
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
  // Prepare matches by transforming each source item. map returns a new array; the response records remain available in their original shape.
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
      {/* Conditional JSX: render the following block only when the left-hand condition is truthy; otherwise React leaves it out. */}
      {mobileOpen && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={
            // Open/close the responsive sidebar drawer; CSS classes handle its existing layout and movement.
            () => setMobileOpen(false)
          }
        />
      )}
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <Link
          href="/dashboard"
          className="brand"
          onClick={
            // Open/close the responsive sidebar drawer; CSS classes handle its existing layout and movement.
            () => setMobileOpen(false)
          }
        >
          <div className="brand-symbol">
            <Icon name="monitoring" size={22} />
          </div>
          <span>FinTrack</span>
          <span className="pro-badge">PRO</span>
        </Link>
        <nav aria-label="Main navigation">
          {/* Turn matching items into JSX with map. Each repeated element needs a stable key so React preserves the right row/control when data changes. */}
          {navigation.map((group) => (
            <div className="nav-group" key={group.group}>
              <div className="nav-label">{group.group}</div>
              {/* Turn matching items into JSX with map. Each repeated element needs a stable key so React preserves the right row/control when data changes. */}
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
                  onClick={
                    // Open/close the responsive sidebar drawer; CSS classes handle its existing layout and movement.
                    () => setMobileOpen(false)
                  }
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
            onClick={
              // Open/close the responsive sidebar drawer; CSS classes handle its existing layout and movement.
              () => setMobileOpen(true)
            }
          >
            <Icon name="menu" />
          </button>
          <div className="header-search">
            <Icon name="search" size={18} />
            <input
              aria-label="Search transactions, assets, ledgers"
              value={search}
              onChange={
                // Update the visible search input immediately. The debounced value later changes the request key so typing does not create one request per keystroke.
                (event) => setSearch(event.target.value)
              }
              placeholder="Search transactions, assets, ledgers..."
            />
            {/* Turn matching items into JSX with map. Each repeated element needs a stable key so React preserves the right row/control when data changes. */}
            {search && (
              <div className="search-results">
                {/* Turn matching items into JSX with map. Each repeated element needs a stable key so React preserves the right row/control when data changes. */}
                {matches.length ? (
                  matches.map((item) => (
                    <Link
                      key={item.id}
                      href={`/income-expenses?q=${encodeURIComponent(item.name)}`}
                      onClick={
                        // Update the visible search input immediately. The debounced value later changes the request key so typing does not create one request per keystroke.
                        () => setSearch("")
                      }
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
                    {/* Choose one of two UI branches with condition ? trueBranch : falseBranch. This keeps selected/empty/alternate states in the same layout position. */}
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
              onChange={
                // Update the shared selected month. Screens whose query URLs include it switch to that month result automatically.
                (event) => {
                  if (event.target.value) setMonth(event.target.value);
                }
              }
            />
          </label>
          <div className="header-right">
            <ThemeControl />
            <div className="relative">
              <button
                className="icon-button notification-button"
                aria-label="Notifications"
                aria-expanded={notifications}
                onClick={
                  // Toggle the reminder popover. Its API key becomes active only while the panel is open.
                  () => setNotifications(!notifications)
                }
              >
                <Icon name="notifications" size={21} />
                <i />
              </button>
              {/* Turn matching items into JSX with map. Each repeated element needs a stable key so React preserves the right row/control when data changes. */}
              {notifications && (
                <div className="notification-panel">
                  <strong>Upcoming reminders</strong>
                  {/* Conditional JSX: render the following block only when the left-hand condition is truthy; otherwise React leaves it out. */}
                  {reminders.error && (
                    <p role="alert">
                      {errorMessage(reminders.error)}{" "}
                      <button onClick={reminders.retry}>Retry</button>
                    </p>
                  )}
                  {/* Conditional JSX: render the following block only when the left-hand condition is truthy; otherwise React leaves it out. */}
                  {reminders.loading && <p>Loading…</p>}
                  {/* Turn matching items into JSX with map. Each repeated element needs a stable key so React preserves the right row/control when data changes. */}
                  {state.events
                    .filter((event) => !event.paid)
                    .slice(0, 4)
                    .map((event) => (
                      <Link
                        href="/calendar"
                        key={event.id}
                        onClick={
                          // Toggle the reminder popover. Its API key becomes active only while the panel is open.
                          () => setNotifications(false)
                        }
                      >
                        <span>{event.title}</span>
                        <small>
                          {dateLabel(event.date)} ·{" "}
                          {/* Choose one of two UI branches with condition ? trueBranch : falseBranch. This keeps selected/empty/alternate states in the same layout position. */}
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
              onClick={
                // Toggle the shared transaction dialog through FinanceProvider. The existing form is reused across the header and page action.
                () => setTransactionOpen(true)
              }
            >
              <span className="add-transaction-label">Add Transaction</span>
            </Button>
            <Link
              href="/settings"
              className="profile"
              aria-label="Profile settings"
            >
              {/* Turn matching items into JSX with map. Each repeated element needs a stable key so React preserves the right row/control when data changes. */}
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
                  {/* Turn matching items into JSX with map. Each repeated element needs a stable key so React preserves the right row/control when data changes. */}
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
      {/* Conditional JSX: render the following block only when the left-hand condition is truthy; otherwise React leaves it out. */}
      {transactionOpen && (
        <TransactionEditor open onClose={
          // Toggle the shared transaction dialog through FinanceProvider. The existing form is reused across the header and page action.
          () => setTransactionOpen(false)
        } />
      )}
    </>
  );
}
