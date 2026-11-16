# FinTrack frontend API handoff

Give this file and `docs/openapi.json` to the frontend Copilot. The JSON file is an export
of the backend's real OpenAPI contract, including every endpoint, query parameter,
request body, required field, nullable field, and response schema. This document explains
which data to use for each screen.

## Connection and shared behavior

```dotenv
NEXT_PUBLIC_API_BASE_URL=https://finance-track-py.vercel.app
```

Paths below append to that base URL. Finance paths start with `/api`, not `/api/v1`.
No API key, login token, `user_id` parameter, or cookies are needed in the current demo.
The backend selects the existing demo user. Never expose Supabase database credentials
to the frontend.

Amounts, rates, quantities, and calculated percentages are returned as JSON **strings**
to preserve decimal precision. For example, `"1250.50"`, not `1250.5`. IDs, counts, page
numbers, tenure months, and financial-year start months are numbers. Nullable values
are JSON null. Dates are `YYYY-MM-DD`; timestamps are ISO strings.

In the field descriptions below, `Decimal` means a decimal string, `Date` means a date
string, and `?` means the returned value can be null, not that the key is absent.

All nine standard resource collections return:

```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "page_size": 50
}
```

Read the rows from `data.items`, not from `data` itself. Lists accept `page=1` and
`page_size=20` (maximum 100). `total` is the total matching row count before pagination.
Detail routes return one object. Students and PPF contributions return arrays instead.

## Standard create/edit/delete flow

For `transactions`, `categories`, `budgets`, `loans`, `investments`, `fixed-deposits`,
`ppf`, `savings-goals`, and `reminders`:

```text
GET    /api/<resource>              -> 200, paginated collection
POST   /api/<resource>              -> 201, created record including computed fields
GET    /api/<resource>/{record_id}  -> 200, one record
PATCH  /api/<resource>/{record_id}  -> 200, updated record including computed fields
DELETE /api/<resource>/{record_id}  -> 204, no response body
```

POST requires the fields specified in the OpenAPI create schema; do not assume every
response field is writable. PATCH sends only changed writable fields. Omitted fields stay
unchanged; null clears only nullable fields. Never submit `id`, `user_id`, `created_at`,
or computed response fields. Extra fields are rejected. Do not call `response.json()`
after a successful 204 DELETE. Use JSON content type for writes.

## Transactions screen

`GET /api/transactions` -> paginated `TransactionRead` records:

```text
id: number; user_id: number
description: string; amount: Decimal
transaction_type: income | expense | investment | loan_payment | transfer
transaction_date: Date; category_id: number?
reference_code: string?; payment_method: string?; notes: string?
created_at: timestamp?
```

Filters: `search`, `transaction_type`, `category_id`, `payment_method`, `date_from`,
`date_to`, `min_amount`, `max_amount`, `page`, `page_size`. Date/amount bounds are inclusive.
Search checks description, notes, and reference code. Results are newest date first.

Example: `/api/transactions?transaction_type=expense&date_from=2024-10-01&date_to=2024-10-31&page=1&page_size=20`.
Category names are not embedded in each transaction. Load categories to resolve
`category_id` to a display label. Only an appropriate category type can be assigned.

## Categories screen and dropdowns

`GET /api/categories` -> paginated `CategoryRead` records:

```text
id: number; user_id: number?; name: string
type: income | expense | investment | loan_payment
```

Use `?type=expense` for budget/expense dropdowns. Shared categories have `user_id: null`;
display them but disable their edit/delete controls. Transfers should omit category ID.
Create/edit bodies contain only `name` and `type`.

## Budgets screen

`GET /api/budgets?month=2024-10-01` -> paginated `BudgetRead` records:

```text
id: number; user_id: number; category_id: number; budget_month: Date
limit_amount: Decimal
spent_amount: Decimal; remaining_amount: Decimal; usage_percent: Decimal?
```

Render progress using the backend's usage percentage; null means the limit is zero.
Negative remaining amount means over budget. Spending is actual expense transactions
in that category/month, not a separately editable field. Create/edit uses category ID,
budget month, and limit amount. The backend normalizes the month to its first day.

## Loans screen

`GET /api/loans` -> paginated `LoanRead` records:

```text
id: number; user_id: number; account_reference: string?
loan_name: string; loan_type: string
principal: Decimal; outstanding_balance: Decimal; interest_rate: Decimal
tenure_months: number; monthly_emi: Decimal
start_date: Date; next_due_date: Date?; status: string?
calculated_emi: Decimal; estimated_total_interest: Decimal
```

`monthly_emi` is the stored amount; `calculated_emi` is the formula result. Display their
labels distinctly. Do not overwrite the stored amount automatically with the estimate.

`GET /api/loans/{record_id}/amortization` -> one object:

```text
loan_id, basis, calculated_emi, reported_monthly_emi, total_payment, total_interest
schedule: [
  {installment, due_date, opening_balance, payment, principal, interest, closing_balance}
]
```

Installment is a number; all amounts are Decimal strings. This is an original-loan
projection, not paid-installment history. Show the supplied calculation `basis`.

## Investments screen

`GET /api/investments` -> paginated `InvestmentRead` records:

```text
id: number; user_id: number; asset_type: stock | mutual_fund
name: string; symbol: string?; quantity: Decimal
average_buy_price: Decimal; current_price: Decimal; purchase_date: Date?
monthly_sip: Decimal?; next_sip_date: Date?
invested_value: Decimal; current_value: Decimal
gain_loss: Decimal; gain_loss_percent: Decimal?
```

Use returned valuations and gain/loss for cards and rows. Prices come from the database;
there is no live market feed. Calculated valuation/gain fields are read-only.

## Fixed deposits screen

`GET /api/fixed-deposits` -> paginated `FixedDepositRead` records:

```text
id: number; user_id: number; fd_reference: string?; bank_name: string
principal: Decimal; interest_rate: Decimal; start_date: Date; maturity_date: Date
compounding_frequency: monthly | quarterly | half_yearly | annually | simple | null
status: string?
estimated_maturity_value: Decimal; estimated_interest: Decimal
estimated_current_value: Decimal; calculation_basis: string
```

Show estimate labels and the calculation basis. A supported non-null frequency is
needed when saving a deposit. The three estimated values are computed, not writable.

## PPF accounts and contributions screen

`GET /api/ppf` -> paginated `PPFRead` accounts:

```text
id: number; user_id: number; account_reference: string?; bank_name: string?
opening_balance: Decimal?; current_balance: Decimal?; interest_rate: Decimal?
opening_date: Date; maturity_date: Date
total_contributions: Decimal
```

`GET /api/ppf/{record_id}/contributions` -> an array:

```text
[{id: number, ppf_account_id: number, reference_code: string?,
  amount: Decimal, contribution_date: Date}]
```

POST on that collection creates a contribution. PATCH/DELETE use
`/api/ppf/{record_id}/contributions/{contribution_id}`. Create/edit bodies contain amount,
contribution date, and optionally reference code. The backend adjusts the account balance
atomically; do not also PATCH an incremented account balance. Contributions do not
automatically create ledger transactions; don't synthesize cash flow by adding their
balances to transaction totals.

`GET /api/ppf/{record_id}/interest?financial_year=2024` -> one estimate:

```text
account_id: number; financial_year: number; interest_rate: Decimal
estimated_interest: Decimal; is_estimate: boolean; basis: string
months: [{month: Date, eligible_balance: Decimal, estimated_interest: Decimal}]
```

2024 means April 2024-March 2025. Display the estimate/basis; it does not post interest
to the account. Do not add total contributions to current balance again.

## Savings goals screen

`GET /api/savings-goals` -> paginated `SavingsGoalRead` records:

```text
id: number; user_id: number; name: string
target_amount: Decimal; saved_amount: Decimal?; target_date: Date?
remaining_amount: Decimal; progress_percent: Decimal
```

Use returned progress and remaining amounts. Saved amount is an editable snapshot;
there is no separate goal contribution-history endpoint.

## Reminders screen

`GET /api/reminders` -> paginated `ReminderRead` records:

```text
id: number; user_id: number; title: string; amount: Decimal?
due_date: Date; reminder_type: string?; status: string?
```

`GET /api/reminders/upcoming?as_of=2024-11-01&days=30&include_overdue=true` returns the same
paginated shape, filtered to pending reminders, ordered by due date. There is no automatic
recurrence or notification delivery.

## Profile and preferences screen

`GET /api/settings` -> one object:

```text
profile: {id: number, name: string, email: string, created_at: timestamp?}
preferences: {currency: string?, financial_year_start: number?, number_format: string?} | null
```

`PATCH /api/settings` -> the same object after update. Writable fields are flat:

```json
{"name":"Alex Morgan","currency":"INR","financial_year_start":4,"number_format":"indian"}
```

Do not send the GET response's nested `profile` or `preferences` objects as the PATCH body.
Omit unchanged settings; do not send null. Currency changes display preferences, not
the currency of historical amounts.

## Dashboard screen

`GET /api/dashboard?month=2024-10-01&as_of=2024-11-01` -> one object:

```text
month: Date; as_of: Date; currency: string?
income: Decimal; expenses: Decimal; balance: Decimal; balance_basis: string
cash_flow: CashFlow
investments: {
  invested_value, current_value, gain_loss, gain_loss_percent,
  fixed_deposit_estimated_value, ppf_reported_balance, total_asset_value
}
outstanding_loans: Decimal
budget_usage: {limit_amount, spent_amount, remaining_amount, usage_percent, budgets: BudgetRead[]}
upcoming_obligations: [
  {source, source_id, title, due_date, amount, direction, overdue}
]
recent_transactions: TransactionRead[]
```

Portfolio values and budget numbers are Decimal strings; gain/usage percentages can be
null. Obligation source IDs are numbers, `overdue` is boolean, amount can be null, and
direction identifies inflow/outflow. `source` plus `source_id` makes a stable event key.

Use this endpoint for dashboard cards instead of fetching every collection and summing
them in the browser. `balance` means that month's recorded net cash flow, not a bank
balance. Asset/loan values are current snapshots; `as_of` controls upcoming-event timing.
Don't add investments, loans, budgets, or obligations to cash-flow totals again.

`CashFlow` has:

```text
income, expenses, investment_outflow, loan_payments, transfers,
total_outflow, net_cash_flow, savings_rate_percent, transaction_count
```

Amounts/percentage are Decimal strings (savings rate can be null); count is a number.
Transfers are excluded from net cash flow. Savings rate measures income minus expenses,
not income minus all investment/loan outflows.

## Reports screens

All three endpoints accept inclusive `date_from` and `date_to` query parameters.

`GET /api/reports/summary?date_from=2024-10-01&date_to=2024-10-31` returns:

```text
date_from, date_to, currency
totals: CashFlow
previous_period: CashFlow
income_change_percent: Decimal?; expense_change_percent: Decimal?
accounting_basis: string
```

Use totals for summary cards and change percentages for trends. Previous period is the
same number of days immediately before the requested range.

`GET /api/reports/monthly?date_from=2024-01-01&date_to=2024-12-31` returns:

```text
date_from, date_to, currency
months: [{month: Date, ...CashFlow fields}]
```

Use `data.months` for income/expense/cash-flow charts. Empty months are included with
zero amounts. Convert chart coordinates for display only; preserve original strings.

`GET /api/reports/categories?date_from=2024-10-01&date_to=2024-10-31` returns:

```text
date_from, date_to, currency
categories: [
  {category_id: number?, category_name: string, transaction_type: string,
   amount: Decimal, transaction_count: number, share_of_type_percent: Decimal?}
]
```

Filter rows to `transaction_type === "expense"` for an expense pie chart. Shares are
calculated within each transaction type; do not mix income and expense slices.

If dates are omitted, summary/categories default to the current month and monthly
defaults to the trailing twelve months. Existing demo activity is October 2024; use
those dates when testing instead of treating an empty current-month report as a bug.

## Health and legacy test routes

- `GET /api/v1/health` -> `{"status":"ok"}` if the process is running.
- `GET /api/v1/health/ready` -> `{"status":"ok"}` if the DB connection works; otherwise 503.
- `GET /api/v1/students` -> `[{id: number, name: string | null, age: number | null}]`.

## Errors, refreshes, and UI behavior

Check `response.ok` before reading success data. Typical errors have
`{"detail":"message"}`; validation failures may instead have a `detail` array with
field locations and messages. Handle 403 (shared category), 404 (missing record),
409 (duplicate/referenced record), 422 (invalid input), 503 (database unavailable),
and network errors. Never replace failed requests with fake zero totals or dummy records.

Use loading, empty, error, retry, and save/delete-pending states. Disable repeated
submissions while a write is pending. Re-fetch affected records and aggregations:

- Transaction writes: transaction list, dashboard, budgets, reports.
- Budget writes: budget list and dashboard.
- Loan/investment/FD/reminder writes: matching list and dashboard.
- PPF contribution writes: contributions, account balance, interest estimate, dashboard.
- Category writes: categories/dropdowns and reports/labels that use category names.
- Settings writes: profile/preferences and displayed formats.

Use `cache: "no-store"` for demo reads or an appropriate frontend cache with invalidation.
Keep the existing UI styling and replace its mock data with these real API responses.
The deployed origin `https://finance-nxt.vercel.app` is configured for CORS; backend
environment overrides must retain that origin without a trailing slash.
