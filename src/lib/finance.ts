/*
 * src/lib/finance.ts
 * Shared display, local calculator, and file-download helpers. These functions do not save API records; calculator results are browser-side estimates.
 * Beginner syntax: @/ means src/ (tsconfig paths); import type is compile-time only.
 */
// Format numeric calculator/chart values as currency. For API decimal strings and saved formatting preferences, screens normally use useAmount instead.
export function money(value: number, currency = "INR", decimals = 0) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(value);
}
// Shorten large numeric axis labels using crore/lakh/thousand units so chart labels fit the available width.
export function compact(value: number) {
  return value >= 10000000
    ? `${(value / 10000000).toFixed(2)}Cr`
    : value >= 100000
      ? `${(value / 100000).toFixed(2)}L`
      : value >= 1000
        ? `${(value / 1000).toFixed(1)}k`
        : String(value);
}
// Format the date-only part at local noon, reducing timezone day-boundary surprises. Optional Intl options let each screen choose month/day/year detail.
export function dateLabel(date: string, options?: Intl.DateTimeFormatOptions) {
  return new Date(`${date.slice(0, 10)}T12:00:00`).toLocaleDateString(
    "en-IN",
    options ?? { day: "2-digit", month: "short", year: "numeric" },
  );
}
// Ask the platform for a random UUID when a temporary unique identifier is needed; this is not a replacement for backend record IDs.
export function uid() {
  return crypto.randomUUID();
}
// Use a caller-provided numeric selector to add an array. T keeps the input row type; use api-format.total for exact decimal-string financial rollups.
export function sum<T>(items: T[], fn: (item: T) => number) {
  return items.reduce((total, item) => total + fn(item), 0);
}
// Apply compound interest A=P(1+r/n)^(nt). Rate is percent per year and frequency is compounds per year; return principal, interest, and maturity for the local estimator.
export function calculateFD(
  principal: number,
  rate: number,
  years: number,
  frequency = 4,
) {
  const maturity =
    principal * Math.pow(1 + rate / 100 / frequency, frequency * years);
  return { principal, interest: maturity - principal, maturity };
}
// Convert annual percentage to a monthly rate and apply the fixed-payment loan formula. Handle zero interest separately to avoid dividing by zero.
export function calculateEMI(
  principal: number,
  annualRate: number,
  months: number,
) {
  if (months <= 0 || principal <= 0) return { emi: 0, interest: 0, total: 0 };
  const rate = annualRate / 1200;
  const emi =
    rate === 0
      ? principal / months
      : (principal * rate * Math.pow(1 + rate, months)) /
        (Math.pow(1 + rate, months) - 1);
  return { emi, interest: emi * months - principal, total: emi * months };
}
// Simulate repayment month by month with optional top-up/lump sum. Return Infinity for an insufficient payment and cap iteration to prevent a runaway estimate; this is not actual payment history.
export function amortization(
  principal: number,
  annualRate: number,
  payment: number,
  extra = 0,
  lumpSum = 0,
) {
  let balance = Math.max(0, principal - lumpSum);
  let interest = 0;
  let months = 0;
  // Accumulate one projected repayment row per simulated month. This local array is not a backend collection or a history of actual payments.
  const rows: {
    month: number;
    principal: number;
    interest: number;
    payment: number;
    balance: number;
  }[] = [];
  if (payment + extra <= (balance * annualRate) / 1200)
    return { months: Infinity, interest: Infinity, rows };
  while (balance > 0.01 && months < 1200) {
    const monthlyInterest = (balance * annualRate) / 1200;
    const paid = Math.min(balance + monthlyInterest, payment + extra);
    const repaid = paid - monthlyInterest;
    balance = Math.max(0, balance - repaid);
    interest += monthlyInterest;
    months++;
    rows.push({
      month: months,
      principal: repaid,
      interest: monthlyInterest,
      payment: paid,
      balance,
    });
  }
  return { months, interest, rows };
}
// Create a temporary Blob URL and click a download link. Revoke the URL after the browser has started the download to release browser memory.
export function downloadFile(
  filename: string,
  content: string,
  type = "text/csv;charset=utf-8",
) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
// Quote/escape each cell, guard string cells that resemble spreadsheet formulas, and add a UTF-8 BOM for spreadsheet compatibility before downloading.
export function downloadCSV(filename: string, rows: (string | number)[][]) {
  downloadFile(
    filename,
    "\uFEFF" +
      rows
        .map((row) =>
          row
            .map((cell) => {
              const text = String(cell);
              const safe =
                /^[=+@\-]/.test(text) && typeof cell === "string"
                  ? `'${text}`
                  : text;
              return `"${safe.replaceAll('"', '""')}"`;
            })
            .join(","),
        )
        .join("\r\n"),
  );
}
