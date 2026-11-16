# FinTrack

Learning the project? Start with [the code-reading guide](docs/READING_CODE.md), which includes a reading order, request/form walkthroughs, and a glossary. Beginner-friendly comments in the maintained source explain how the pieces connect.

Next.js App Router + TypeScript frontend for the FinTrack Google Stitch designs, connected to the FastAPI contract in [FRONTEND_HANDOFF.md](FRONTEND_HANDOFF.md) and [openapi.json](openapi.json). Styling, light/dark/system themes, and the existing deployment configuration are preserved.

## Run

```sh
npm install
npm run dev
```

Open http://localhost:3000. Financial filters start at **October 2024**, which contains the existing backend demo transactions.

The default backend is `https://finance-track-py.vercel.app`. Copy `.env.example` to `.env.local` to configure it. For local backend testing, set:

```dotenv
API_BASE_URL=http://127.0.0.1:8000
```

Restart the dev server after changing environment variables. `API_BASE_URL` is a server-side override; otherwise the proxy uses `NEXT_PUBLIC_API_BASE_URL`, defaulting to the deployed backend. Browser requests use same-origin `/api/...` routes, and the Next.js proxy forwards only the supported finance resources. This avoids relying on localhost CORS configuration. It contains no database credentials, forwards no cookies, and implements no business logic. No authentication is required by the current backend.

## Connected screens

- `/` and `/dashboard`: `/api/dashboard` for cards, assets, budget usage, upcoming obligations, and recent transactions; monthly reports for cash-flow charts.
- `/income-expenses`: paginated transactions, server-side search/type/category/payment/date filters, create/edit/delete, CSV import, and category lookup.
- `/budgets`: month-specific budget envelopes; backend-calculated spending and utilization; create/edit/delete.
- `/loans-emi`: loan CRUD, stored versus calculated EMI, amortization API with the supplied calculation basis, and local EMI/prepayment calculators.
- `/stocks-investments`: investment CRUD, returned valuations and gains, SIP snapshots, holding filters, and CSV exports. Full redemption deletes the holding; partial redemption updates its quantity. These actions do not create ledger transactions automatically.
- `/fixed-deposits`: deposit CRUD, backend-estimated current/maturity values and basis, maturity milestones, and a local FD calculator.
- `/ppf-savings`: PPF account and contribution CRUD, annual contribution filtering, interest estimates, receipts, and savings goal CRUD. Contributions update the account through the contribution endpoint; the frontend never increments the account balance again.
- `/reports-analytics`: summary/monthly/category report endpoints, date comparisons, transaction-based heatmaps, previews, and PDF/CSV/ZIP/Excel-compatible XML exports.
- `/calendar`: dashboard obligations plus saved reminders; month/week/agenda views, reminder CRUD and completion status, PDF/iCalendar exports.
- `/settings`: profile/preferences PATCH, category CRUD with shared-category protection, formatting preferences, and read-only JSON backup export.

## Data and architecture

- `src/types/api.ts` and `src/lib/api-contract.ts` are generated from the supplied OpenAPI schemas. Regenerate with `npm run api:types` after updating `openapi.json`.
- `src/lib/api-client.ts` handles HTTP/validation/network errors, `204` responses, query parameters, and complete collection traversal.
- `src/lib/api-cache.ts` deduplicates reads, rejects stale responses, and revalidates active data after writes. Inactive queries are marked stale and refreshed on next use.
- `src/components/resource-editor.tsx` builds typed-schema forms and sends only writable fields. PATCH excludes unchanged values; optional nulls clear only nullable fields. IDs, user IDs, and computed values are excluded.
- `src/app/api/[...path]/route.ts` is the configurable transport proxy. The original `next.config.ts` settings are unchanged.
- `src/components/ui/` contains shared styled controls and loading/error/retry/empty states. Forms prevent repeated submissions and retain validation errors.
- `src/lib/api-format.ts` preserves decimal strings and uses exact decimal addition for read-only rollups. Conversion to numbers is limited to formatting, charts, and local calculator inputs. Financial records are not stored in localStorage; only device appearance is persisted locally.

Transaction pagination uses `{items,total,page,page_size}`. Module lists traverse every backend page before local display filtering. Column sorting on the paginated transaction ledger applies to the current page because the API exposes no ordering parameter.

Dashboard `balance` is recorded monthly **net cash flow**, not a bank balance. Operating expenses exclude investment and loan-payment outflows. Asset and loan valuations are current snapshots. Missing nullable amounts display as unavailable; failed requests never fall back to mock records or fabricated zero totals.

Settings number-format preferences apply to displayed amounts. Currency preferences do not convert historical INR records; the API provides no exchange rates. Theme changes are saved independently and synchronized across tabs.

CSV import accepts `description,amount,transaction_date,transaction_type`. Optional fields: `category_id,payment_method,reference_code,notes`. Amounts are positive decimal strings; dates are ISO `YYYY-MM-DD`; types are `income`, `expense`, `investment`, `loan_payment`, or `transfer`. Quoted fields are supported. Rows are submitted individually; a partial failure reports the number already saved so retries need not duplicate them.

## Contract limitations

Historical market prices, sector/benchmark analytics, tax calculations, AI insights, comparative bank rates, bank linking, maturity instructions, saved prepayment strategies, notification delivery/preferences, avatar/PAN/phone storage, budget rollover, and bulk import/reset are not exposed by the current API. Related UI controls are disabled or show an explanatory empty state. No fake values or success messages replace these missing services. Calendar sync downloads an `.ics` file for import; it does not create a Google login or bank mandate. Generated statements are personal summaries, not bank-issued or tax certificates.

## Verify

```sh
npm run api:types
npm run lint
npm run typecheck
npm run build
npm run test:e2e
npm run test:api-live
```

Browser tests use contract-shaped fixtures captured from read-only API responses; they do not mutate the deployed account. They cover writable payloads for each module, changed-only PATCH, 204 DELETE, pagination, data refreshes, errors/retry, shared categories, responsive routes, and themes. Playwright uses port 3100, Microsoft Edge on Windows, or Chromium elsewhere (`npx playwright install chromium`). Build before running tests against a production preview; `PLAYWRIGHT_CHANNEL` can select another installed browser. `test:api-live` performs read-only checks against the configured backend.

Stitch references, temporary verification scripts, and screenshots live in ignored `.local/` files. Application code never imports test fixtures or requires Stitch credentials to run.
