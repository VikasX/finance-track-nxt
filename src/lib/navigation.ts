/*
 * src/lib/navigation.ts
 * The sidebar menu data consumed by AppShell. Keeping route labels, URLs, and icon names together avoids repeating menu markup across pages.
 * Beginner syntax: @/ means src/ (tsconfig paths); import type is compile-time only.
 */
// Group sidebar links as data; AppShell loops over these groups and marks the current URL active.
export const navigation = [
  {
    group: "Main",
    items: [{ href: "/dashboard", label: "Dashboard", icon: "dashboard" }],
  },
  {
    group: "Personal Finance",
    items: [
      {
        href: "/income-expenses",
        label: "Income & Expenses",
        icon: "account_balance_wallet",
      },
      { href: "/budgets", label: "Budgets", icon: "pie_chart" },
      { href: "/loans-emi", label: "Loans & EMI", icon: "receipt_long" },
    ],
  },
  {
    group: "Wealth & Investments",
    items: [
      {
        href: "/stocks-investments",
        label: "Stocks & Mutual Funds",
        icon: "trending_up",
      },
      { href: "/fixed-deposits", label: "Fixed Deposits", icon: "lock_clock" },
      { href: "/ppf-savings", label: "PPF & Savings", icon: "savings" },
    ],
  },
  {
    group: "Tools",
    items: [
      {
        href: "/reports-analytics",
        label: "Reports & Analytics",
        icon: "monitoring",
      },
      {
        href: "/calendar",
        label: "Financial Calendar",
        icon: "calendar_month",
      },
      { href: "/settings", label: "Settings", icon: "tune" },
    ],
  },
];
