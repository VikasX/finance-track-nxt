const base = (
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://finance-track-py.vercel.app"
).replace(/\/$/, "");
for (const path of [
  "/api/v1/health/ready",
  "/api/dashboard?month=2024-10-01&as_of=2024-11-01",
  "/api/categories?page=1&page_size=1",
  "/api/transactions?date_from=2024-10-01&date_to=2024-10-31&page=1&page_size=1",
  "/api/budgets?month=2024-10-01&page_size=1",
  "/api/loans?page_size=1",
  "/api/investments?page_size=1",
  "/api/fixed-deposits?page_size=1",
  "/api/ppf?page_size=1",
  "/api/savings-goals?page_size=1",
  "/api/reminders?page_size=1",
  "/api/settings",
  "/api/reports/summary?date_from=2024-10-01&date_to=2024-10-31",
]) {
  const response = await fetch(base + path, {
    signal: AbortSignal.timeout(30000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  const data = await response.json();
  if (
    "items" in data &&
    (!Array.isArray(data.items) || typeof data.total !== "number")
  )
    throw new Error(`${path}: Invalid collection envelope`);
  if (path.startsWith("/api/dashboard") && typeof data.balance !== "string")
    throw new Error("Dashboard balance must be a decimal string");
  console.log(`PASS ${path}`);
}
console.log("Read-only live API checks passed.");
