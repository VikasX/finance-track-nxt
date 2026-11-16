# Learning the FinTrack code

Start with one route and follow the calls. You do not need to understand every screen at once. The same loading, table, and form patterns repeat across the application.

## 1. Suggested reading order

1. **`package.json` and `README.md`** — learn how to run the app and what is connected. `dev` starts development, `build` creates production output, `start` serves that output, `lint` checks source rules, `typecheck` checks TypeScript, and `test:e2e` runs Playwright. `api:types` regenerates contract files; `test:api-live` makes read-only requests to the configured backend.
2. **`src/app/layout.tsx`** — the outer document shared by every page. Read the provider nesting from outside to inside: `ThemeProvider` → `FinanceProvider` → `AppShell` → the active route (`children`). Fonts and `globals.css` also enter here.
3. **`src/app/page.tsx` and `src/app/dashboard/page.tsx`** — two small wrappers that render the same dashboard screen at `/` and `/dashboard`. The home URL stays `/`; there is no redirect. A folder inside `app` defines its URL; its `page.tsx` supplies the page. Metadata sets the title, while the imported component supplies the screen.
4. **`src/components/finance-provider.tsx`** — the shared selected month, global transaction-dialog state, and toast. This is UI state, not a database or a store of downloaded financial records.
5. **`src/components/app-shell.tsx` and `src/lib/navigation.ts`** — how sidebar links, active-route styling, global search, reminders, month selection, and the global Add Transaction dialog surround the route.
6. **`src/components/pages/dashboard.tsx`** — see requests, small display transformations, and JSX in one place. Follow only the `dashboard` variable first; return later for charts/categories.
7. **`src/lib/api-cache.ts` → `src/lib/api-client.ts` → `src/app/api/[...path]/route.ts`** — follow one request from React to FastAPI. The detailed example below explains this chain.
8. **`src/components/ui/api-boundary.tsx`, `primitives.tsx`, and `data-table.tsx`** — learn how screens reuse loading/error handling, buttons/cards/dialogs/forms, and tables. `api-state.tsx` contains alternative state helpers; it is not the main wrapper used by the screens.
9. **`transaction-editor.tsx` → `resource-editor.tsx` → `RecordForm` inside `ui/primitives.tsx`** — follow a complete form. Read the submission walkthrough below alongside these files.
10. **`src/components/pages/transactions.tsx` and `transaction-table.tsx`** — connect filtering, pagination, edit/delete selection, CSV import, and cache refresh. The route wrapper adds `Suspense` because the screen reads URL search parameters.
11. **The other `src/components/pages/` files** — each uses the same shared request/form patterns. Use the page map below to choose a familiar module.
12. **`src/lib/api-format.ts`, `finance.ts`, `csv.ts`, `export.ts`, and `components/use-amount.ts`** — understand display conversion, exact decimal totals, local calculators, CSV parsing, and exports.
13. **`src/lib/theme.ts`, `components/theme-provider.tsx`, `theme-control.tsx`, and `app/globals.css`** — follow how a saved device preference becomes `data-theme` and changes CSS variables.
14. **`tests/` and configuration files** — see the important behaviors expressed as checks, then read how the tools are configured.

### Where each screen lives

- `/` renders the same Dashboard through `src/app/page.tsx`, while keeping the home URL.
- `/dashboard` → `components/pages/dashboard.tsx`: dashboard summary, charts, budgets, obligations, recent transactions.
- `/income-expenses` → `components/pages/transactions.tsx`: server-filtered, paginated ledger and CSV import.
- `/budgets` → `components/pages/budgets.tsx`: monthly envelopes and backend-computed spending/usage.
- `/loans-emi` → `components/pages/loans.tsx`: loans, projected amortization, and local loan scenarios.
- `/stocks-investments` → `components/pages/investments.tsx`: holdings, valuations, allocation, and redemption updates.
- `/fixed-deposits` → `components/pages/deposits.tsx`: deposits, backend estimates, and a separate local estimator.
- `/ppf-savings` → `components/pages/savings.tsx`: accounts, contributions, interest estimates, and goals.
- `/reports-analytics` → `components/pages/reports.tsx`: date-filtered reports, comparisons, heatmap, and exports.
- `/calendar` → `components/pages/calendar.tsx`: obligations plus reminders, without duplicate reminder sources.
- `/settings` → `components/pages/settings.tsx`: profile/preferences, personal categories, theme, and read-only export.

Each route has a matching `src/app/<route>/page.tsx`. Those wrappers stay small on purpose: the URL/title concerns live there; interactive behavior lives in `components/pages/`.

### Other shared files

- `components/charts.tsx` renders numeric points through Recharts; pages decide which API fields become those points.
- `components/ui/icon.tsx` maps existing design icon names to Lucide components.
- `components/ui/range-field.tsx` keeps calculator sliders and numeric inputs connected to one parent value.
- `components/use-amount.ts` uses the cached settings response to format amounts consistently. It does not convert currencies.
- `lib/navigation.ts` defines sidebar groups and links. Labels are data; `AppShell` produces the repeated JSX.
- `lib/theme.ts` exports the appearance union, storage key, and trusted startup script. The early script avoids waiting for an effect before applying the initial theme.
- `lib/csv.ts` understands CSV quoting; the transaction page separately validates writable columns and submits rows.
- `lib/export.ts` creates PDF/ZIP/spreadsheet XML files; `lib/finance.ts` supplies download mechanics and local calculator formulas.

## 2. Walkthrough: dashboard loading backend data

### A. Next chooses a route and wraps it

Opening `/dashboard` selects `src/app/dashboard/page.tsx`. Next inserts that page into `RootLayout` as `children`. The layout is a **Server Component** by default. It can render client components without becoming one itself.

`AppShell` surrounds the page with persistent navigation. `Dashboard` declares `"use client"` because it uses hooks and event handlers. That directive establishes an interactive module boundary; it does **not** mean the initial HTML can never be rendered on the server. Hydration attaches React behavior in the browser.

### B. The screen constructs a request key

`Dashboard` calls `useFinance()` to read `month`, initially `"2024-10"`. It derives a snapshot date of `2024-11-01` for that month and calls:

```ts
useApi<DashboardRead>(
  apiPath("/api/dashboard", { month: "2024-10-01", as_of: "2024-11-01" }),
);
```

The example shows the initial values; the source derives them from shared state. `apiPath` safely encodes query parameters. `DashboardRead` describes fields such as `income`, `expenses`, `balance`, `investments`, `budget_usage`, `upcoming_obligations`, and `recent_transactions`. The type helps the editor; it does not fetch or validate JSON by itself.

The **whole URL is the cache key**. Changing the month produces a different URL/result. Requests for categories and monthly charts use separate keys and can load independently.

### C. The cache connects external data to React

In `lib/api-cache.ts`, `useApi` uses `useSyncExternalStore` to subscribe to a cache entry. Initially that entry has no data and is loading/stale. An effect runs `load(key)` after rendering. Its `[key]` dependency means a new key triggers another load.

`load` avoids duplicate requests for an already-loading or fresh key. An `AbortController` can cancel obsolete work. A version counter provides another safeguard: only the latest request may publish its result, even if an old response finishes late.

The subscription returns cleanup that removes this component's listener. It does not cancel a shared request merely because one component unmounted; another component may still need it. Debounce effects have a different cleanup: they cancel their own pending timer.

`all:/api/categories` is a special **internal cache key**, not a real backend URL. `load` removes `all:` and calls `fetchAll`, which traverses paginated responses. A plain dashboard key returns one object instead.

### D. The HTTP helper and server proxy contact FastAPI

`request` in `lib/api-client.ts` makes a same-origin browser fetch such as:

```text
Browser → Next /api/dashboard?month=2024-10-01&as_of=2024-11-01
Next proxy → configured FastAPI /api/dashboard with the same query
```

`app/api/[...path]/route.ts` runs on the server. `[...path]` captures `dashboard`, or several segments for a URL such as `ppf/1/contributions`. In this installed Next version `context.params` is asynchronous, so the handler awaits it.

The proxy chooses `API_BASE_URL`, then `NEXT_PUBLIC_API_BASE_URL`, then the deployed default. For a local backend, use `API_BASE_URL=http://127.0.0.1:8000` and restart the server. When Next is deployed, `127.0.0.1` refers to that server environment, so use the deployed service URL there.

Only supported finance resources are forwarded. This proxy forwards transport information; it does not implement financial business rules, authentication, or database access. Financial reads use `no-store`, while the React cache manages visible request state in memory.

### E. Success, loading, empty, and error are different

On success, `request` parses JSON. The cache publishes a new snapshot and notifies subscribers. React renders again with `dashboard.data` available.

`ApiBoundary` checks errors first, then whether data is undefined. It renders loading initially, an error and Retry on failure, or children on success. While refreshing existing data it can show `Refreshing…` alongside that data. A successful response with no rows is handled by page/table `EmptyState`; it is not a network error. `ApiBoundary` is a request-state component, not React's exception-catching error-boundary mechanism.

HTTP errors need an explicit `response.ok` check because `fetch` does not throw for HTTP 422/500. FastAPI may send a `detail` string or a validation error array; the client converts either to readable text. Network/timeouts have no HTTP response and receive a separate message. Retry forces a new request for the same key.

### F. The page displays the response

`balance` is recorded monthly **net cash flow**, not a bank balance. Budget spending and valuation estimates come from response fields. The frontend does not recreate these business calculations.

API money arrives as decimal strings such as `"120000.00"`. `useAmount` formats a value for display. `decimal` converts values for charts/comparisons, and `total` adds decimal strings exactly using scaled `BigInt` values. Keep these jobs separate: formatting a number is not changing the stored amount.

## 3. Walkthrough: adding and editing a transaction

### A. Open the dialog

An Add Transaction button calls `setTransactionOpen(true)` from `FinanceProvider`. `AppShell` renders `TransactionEditor` using that shared flag. For an edit in the ledger, `TransactionsView` instead stores the selected `TransactionRead` and renders an editor with that record.

Ledger edit/delete selection lives outside `ApiBoundary`, so a debounced search or table reload cannot accidentally unmount an in-progress form.

### B. Load categories and prepare inputs

`TransactionEditor` loads categories only while open. Until they arrive it shows a dialog containing loading/retry UI. It then passes the record (if editing), defaults, categories, and `/api/transactions` path to `ResourceEditor`.

`ResourceEditor` reads generated `writeContracts`. That metadata comes from OpenAPI POST schemas and lists writable fields. The editor turns those schemas into `FormField` definitions: labels, input types, options, defaults, and required rules.

Only relevant category types appear. Changing transaction nature updates `kind`, which rebuilds category choices. Transfers omit a category; converting an existing categorized transaction into a transfer sends `category_id: null` to clear it.

Many modules use `undefined | null | Record` for editor selection: **undefined = closed, null = create, record = edit**. This is why `editor !== undefined` and `editor ? ... : ...` can have different jobs.

### C. RecordForm collects and validates

`RecordForm` renders inputs with `name` attributes. These fields use `defaultValue`: the browser holds the current input values, rather than a separate `useState` for every field. Native `required`, `min`, `max`, and input types provide an initial validation layer. The API validates again and remains authoritative.

On submit, `event.preventDefault()` stops a document reload. An immediate `saving.current` ref guard prevents duplicate submissions before React has rerendered. `pending` state updates visible disabled controls/text, and an optional callback tells the dialog it is busy.

`new FormData(event.currentTarget)` reads the current named controls. `Object.fromEntries` converts the pairs to an object. HTML inputs provide strings even when they look numeric.

### D. Build only writable fields

`ResourceEditor` loops over schema fields, not all fields in the API record. This excludes `id`, `user_id`, timestamps, and computed values automatically.

- Decimal amounts stay strings, such as `"123.45"`.
- Integer IDs/counts become numbers; nullable integer schemas are handled too.
- Empty nullable fields become `null` to clear them.
- Empty optional non-nullable fields can be omitted.
- POST includes the supplied writable values. PATCH includes only values that actually changed.
- Decimal comparison ignores harmless trailing zeros, so `"10.00"` and `"10.0"` do not create an unnecessary edit.

For example, changing only the description sends `PATCH /api/transactions/<id>` with `{ "description": "Updated description" }`. The editor does not send the full read response. If nothing changed, it closes without an unnecessary request.

### E. Save, refresh, and display the outcome

`mutate(path, method, payload)` calls `request` with the JSON body. The Next proxy forwards it to FastAPI. After success, `invalidateApi()` marks cached reads stale and refetches active ones. This broad invalidation is intentional: one transaction can affect the ledger, dashboard, report, and budget spending.

The editor then shows a toast and closes. `finally` releases pending/ref guards whether the write succeeded or failed. On failure, the rejection reaches `RecordForm`, which shows the error and retains the form for correction/retry; no fake success toast replaces it.

Deletion follows `ConfirmDelete` → `mutate(..., "DELETE")`. Successful DELETE returns **204 with no JSON**, so both proxy and client return before parsing a body. A rejected delete stays visible in the confirmation dialog.

PPF contributions use the same write machinery with a nested path. Their backend updates the account balance; the frontend only refreshes it and must not apply a second balance increment.

## 4. Glossary for this project

- **Component:** a function that returns React content. Uppercase JSX such as `<Card>` calls a component; lowercase `<section>` describes a browser element.
- **JSX:** HTML-like JavaScript syntax. `{expression}` inserts a value; `{/* explanation */}` is a JSX comment. Comments inside normal JavaScript use `//` or `/* ... */`.
- **Props:** values/callbacks passed by a parent. `{ title, children }` destructures named props. Defaults such as `wide = false` apply when that prop is undefined.
- **children / ReactNode:** nested content supplied between component tags. ReactNode includes elements, text, null, fragments, and other renderable content.
- **Server Component:** the App Router default for route/layout modules without a client boundary. It can compose client components; it cannot use browser-only hooks as if it were an interactive browser component.
- **Client Component / `"use client"`:** a module entry point that permits state, events, and browser behavior. Its imports join the client module graph where appropriate. Initial HTML can still be prerendered.
- **Hydration:** React attaches behavior to server-produced HTML in the browser. The shared Button briefly disables itself until handlers are ready; theme startup deliberately sets the root appearance early.
- **State / `useState`:** remembered render input. `[value, setValue]` is array destructuring; using the setter schedules a new render.
- **Hook:** a React function such as useState/useEffect or a project function beginning with `use`. Call hooks consistently at the component/hook top level, not conditionally inside event handlers.
- **Context / provider:** a way for descendants to read shared values without passing props through every layer. It does not automatically persist data or contact an API.
- **Effect / dependency array:** `useEffect(work, [key])` runs after render and reruns when key changes. Include the values the effect depends on; an ordinary state change need not rerun every effect.
- **Cleanup:** a function returned by an effect/subscription. It removes listeners, cancels pending timers, or restores a previous DOM setting before replacement/unmounting.
- **Ref / `useRef`:** a persistent `.current` container that does not itself rerender React. Used here for DOM access and immediate duplicate-submit guards.
- **`useMemo`:** caches a derived calculation until dependencies change. It is not persistent storage and must not be treated as the source of API data.
- **`useSyncExternalStore`:** connects React rendering to an external store through subscribe/getSnapshot/serverSnapshot callbacks. Used for request cache and appearance changes.
- **Derived data:** values recalculated from existing state/results, such as filtered rows or chart points. They do not need to become another independent saved copy.
- **Controlled input:** `value` plus `onChange` makes React own its current value, as in filters and sliders. **Uncontrolled input:** `defaultValue` seeds a browser-owned value later collected with FormData, as in RecordForm.
- **Callback/event handler:** a function passed to be called later. `onClick={() => setEditor(null)}` waits for a click; passing the result of calling a setter during render would be different.
- **Conditional rendering:** `condition && <Thing />` omits a false branch; `condition ? A : B` chooses a branch. Undefined data must be guarded before reading nested fields.
- **Fragment:** `<>...</>` groups siblings without an extra DOM wrapper, preserving the intended layout.
- **`map` / `filter` / `reduce`:** transform each item / retain matching items / combine items into a result. These do not mutate the source array; `sort` does, so the table sorts `[...rows]` instead of its props.
- **Key:** stable identity for repeated React elements, usually the backend record ID. A deliberately changed component key can reset local state, as with a new global-search q value.
- **Type/interface:** a compile-time description of allowed values/objects. `?` on a property means it may be absent; `|` permits alternatives, including null/undefined where listed.
- **Generic:** a reusable type parameter. `useApi<DashboardRead>` describes one response; `DataTable<T extends { id: string | number }>` accepts different record shapes with stable IDs.
- **Type assertion (`as`):** tells TypeScript what shape to assume. It does not convert a string to a number or validate JSON. `Number(value)` performs an actual conversion.
- **`Record<string, unknown>`:** a dictionary with string keys whose values need narrowing before use. `unknown` is safer than assuming arbitrary values already have the needed type.
- **Union/narrowing/type predicate:** a value can have multiple types; checks narrow them. `(value): value is ThemeMode` tells TypeScript a successful check establishes a theme value.
- **Optional chaining (`?.`):** access/call only when the left side is not null/undefined. **Nullish coalescing (`??`):** use a fallback only for null/undefined, preserving zero and empty strings.
- **Spread/rest (`...`):** spread copies object/array contents; rest gathers remaining props. Later object properties override earlier ones.
- **Template literal:** backticks allow `${value}` inside a string, used for URLs, dates, and class names. The inserted value is computed at runtime.
- **Promise / async / await:** represent work that finishes later. Await pauses that function until it settles; try/catch handles rejection, and finally releases resources/guards on either outcome.
- **`void somePromise()`:** intentionally ignore the returned Promise value for a background operation; it does not make the operation synchronous.
- **Request key/cache/invalidation:** the URL identifies a shared result. Invalidation marks it stale after a successful write, allowing subscribers to refresh without manually rebuilding every page total.
- **Debounce:** wait for a short typing pause before requesting data; cleanup cancels superseded timers.
- **HTTP methods:** GET reads, POST creates, PATCH changes selected fields, DELETE removes. 2xx means success; 204 has no body; 422 often contains field validation errors.
- **Collection envelope:** `{ items, total, page, page_size }`. items is this page, while total counts all matching rows. Detail endpoints return one object; PPF contributions return an array.
- **Decimal string / BigInt:** the API uses text to preserve financial precision. Exact rollups scale decimal strings into integers for addition; chart/local estimator numbers serve a different purpose.
- **Suspense:** a render boundary with temporary fallback content while a subtree suspends. The transactions route needs it for URL search parameters; ApiBoundary separately handles our HTTP request states.
- **CSS variable / Tailwind utility:** `var(--surface)` reads a theme token; classes such as `flex`, `gap-3`, and `text-xs` apply small utility rules. Shared classes such as `card` group recurring design rules.
- **Responsive media query:** applies CSS only at matching viewport/preferences. Later overrides change desktop grids/sidebar behavior for tablets/phones; reduced-motion rules adjust animation.
- **ARIA:** labels/roles/states communicate control meaning to assistive tools, such as `aria-current`, `aria-selected`, `role="alert"`, and `role="status"`.
- **Blob/object URL:** a browser-held file representation and temporary address used for downloads. Revoking that address releases memory after the download starts.

## JSON, generated files, assets, and configuration

These files intentionally receive no inline explanation edits:

- **`openapi.json`** is the exact supplied API contract. `paths` describes methods/parameters/bodies; `components.schemas` describes data. `$ref` points to another schema, `required` lists mandatory keys, `anyOf` lists alternatives, and `readOnly`/response-only fields must not be submitted. JSON does not permit comments.
- **`src/types/api.ts`** is generated compile-time response/request typing. `PageResult<T>` supplies the common collection envelope. Read the relevant type alongside the page, but do not manually add comments here: regeneration would overwrite them.
- **`src/lib/api-contract.ts`** is generated writable-field metadata consumed at runtime by ResourceEditor. `as const` preserves literal/read-only TypeScript information. Read-only typing does not itself freeze JavaScript objects.
- **`scripts/generate-api-types.mjs`** is the maintained generator for those two outputs. The explanation pass comments the generator rather than modifying its emitted string templates or generated files.
- **`tests/fixtures/api.json`** contains captured contract-shaped data for isolated browser tests, never a production fallback. `tests/api-fixture.ts` clones it before simulating reads/writes.
- **`package.json`** declares scripts and dependency ranges. `package-lock.json` records resolved dependency versions for repeatable installs. No dependency change is needed for explanations.
- **`tsconfig.json`** configures TypeScript, including strictness, JSX/Next support, and the `@/*` → `src/*` import alias. A path alias shortens imports; it is not a URL or API endpoint.
- **`next-env.d.ts`**, when present, is Next-generated TypeScript environment wiring. Leave it to Next.
- **`.next/`** contains generated production/development artifacts; **`node_modules/`** contains installed dependencies. Read maintained `src/` code first rather than editing these outputs.
- **`public/`**, `src/app/icon.svg`, and `favicon.ico` provide existing image/icon assets. They are consumed by the UI/Next metadata conventions, not executable finance logic.

Other maintained configuration has comments directly in its source:

- **`next.config.ts`** preserves existing caching/prefetching/Tailwind bundler settings. This is infrastructure configuration; it does not replace `useApi` or fetch's `no-store` behavior.
- **`eslint.config.mjs`** combines Next and TypeScript rules and ignores build/temporary files.
- **`playwright.config.ts`** serves the production build on port 3100 for tests, uses one worker, and captures failures under `.local/`. A previously running server may be reused locally.
- **`.env.example`** documents service URL configuration. `.env.local`, if used, is local configuration and must not contain frontend database credentials. A public-prefixed variable is not a place for secrets.
- **`.gitignore`** excludes dependencies, build output, local environment files, and temporary artifacts while allowing the safe example environment file.
- **`AGENTS.md`** instructs coding tools to consult this installed Next version's documentation. It is not application runtime code.
- **`FRONTEND_HANDOFF.md`** explains screen-to-endpoint mappings and business meaning; `README.md` explains running/configuring the implemented app.

## Reading and running the tests

`tests/finance.spec.ts` tests utility edge cases directly. `fintrack.spec.ts` covers routes and data workflows. `module-writes.spec.ts` runs create forms with multiple module cases. `theme.spec.ts` checks appearance behavior. Their shared API interception is in `api-fixture.ts`; fixtures are isolated from live data.

Playwright's `page` is an automated browser tab. `page.goto` navigates, role/label locators identify accessible controls, and awaited `expect` assertions retry until the expected condition or timeout. Route interception supplies responses before a request reaches the real server. The captured `writes` log allows checking request payloads as well as visible success messages.

Build before running the production browser suite:

```sh
npm run lint
npm run typecheck
npm run build
npm run test:e2e
npm run test:api-live
```

The final command reads the configured real backend. The browser suite uses fixtures, so it can test failures and writes without changing deployed financial records. Run `npm run api:types` only when intentionally updating generated contract output; it is not necessary for a comment-only pass.
