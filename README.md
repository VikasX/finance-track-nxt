# FinTrack

A Next.js App Router and TypeScript implementation of the ten FinTrack screens in the Google Stitch **Finance App Design Review** project. The interface uses Tailwind CSS, Manrope / Inter / JetBrains Mono, Lucide icons, and Recharts.

```sh
npm install
npm run dev
```

Open http://localhost:3000. The demo opens on **October 2024**, matching the design references.

Use the header's sun / moon / monitor selector for **Light**, **Dark**, or **System** appearance. Theme selection persists separately from financial data, follows OS changes in System mode, and syncs across open tabs.

## Pages

- `/` and `/dashboard`: financial overview, cash flow, allocation, budgets, obligations, and recent transactions.
- `/income-expenses`: searchable, sortable, paginated ledger; add, edit, delete, filter, and CSV import.
- `/budgets`: category envelopes, thresholds, rollover preferences, alert filtering, and planned-versus-actual spending.
- `/loans-emi`: liabilities, EMI calculator, prepayment simulator, loan creation, and amortization ledger.
- `/stocks-investments`: stocks and mutual funds, holding filters, purchases/redemptions, portfolio charts, and CSV export.
- `/fixed-deposits`: deposit portfolio, maturity calculator, payout instructions, maturity milestones, and illustrative bank rates.
- `/ppf-savings`: contribution tracking, annual ledger, savings goals, receipts, and contribution reminders.
- `/reports-analytics`: range/account/category filters, comparisons, charts, heatmap, statement previews, PDF/CSV/ZIP/Excel-compatible XML exports.
- `/calendar`: month/week/agenda views, date inspection, reminders, paid status, PDF and iCalendar exports.
- `/settings`: profile/avatar, saved preferences, category management, notification preferences, JSON backup/restore, and confirmed local record deletion.

## Architecture

- `src/app/`: server route entries, metadata, root layout, and global styles. The original Next.js deployment settings are preserved.
- `src/components/pages/`: interactive features grouped by designed page.
- `src/components/ui/`: reusable cards, metrics, badges, tabs, forms, dialogs, ranges, icons, and sortable/paginated tables.
- `src/components/finance-provider.tsx`: shared client state and browser storage boundary, including cross-tab updates and in-memory fallback.
- `src/lib/mock-data.ts`: typed demo records and reference data.
- `src/lib/selectors.ts`: shared totals, budget utilization, chart series, and PPF projections.
- `src/lib/finance.ts`, `csv.ts`, `backup.ts`, `export.ts`: financial arithmetic, parsing, snapshot validation, and genuine file generation.
- `src/types/finance.ts`: domain models for future API contracts.

Records persist in `localStorage` under `fintrack-demo-v1`. The provider is the integration boundary to replace with FastAPI-backed queries/mutations later. No API keys are bundled in the application.

The app has **no backend, authentication, database, live quotes, bank mandates, or external notification delivery**. Preferences for currency, fiscal year, budget start day, rollover, and notifications are saved locally; the reference dataset and monthly reporting remain INR and calendar-month based. “Book FD” records a demo deposit. Calendar sync downloads an `.ics` file to import into Google Calendar. PDF exports are clearly marked demo statements, including the designed TDS certificate action. They are not bank-issued certificates or tax returns.

CSV import accepts `name,amount,date,kind,category,channel` headers. Use positive amounts, ISO `YYYY-MM-DD` dates, and `income`, `expense`, `investment`, or `loan` for `kind`. Quoted fields are supported. Investments and loan repayments are shown as transfers and excluded from operational expense totals.

## Verification

```sh
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```

Playwright runs against a production preview on port **3100**. On Windows it uses the installed Microsoft Edge browser. On other platforms, install Chromium with `npx playwright install chromium`; the configuration uses it automatically. Set `PLAYWRIGHT_CHANNEL` to select a different installed browser. Build before running browser tests.

Stitch HTML/screenshots and verification captures are kept in ignored `.local/` references. They are not loaded by the app, and the app does not require Stitch credentials to run.
