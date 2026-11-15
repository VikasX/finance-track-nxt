import type { FinanceState, Transaction } from "@/types/finance";

export const DEMO_MONTH = "2024-10";
export function money(value: number, currency = "INR", decimals = 0) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(value);
}
export function compact(value: number) {
  return value >= 10000000
    ? `${(value / 10000000).toFixed(2)}Cr`
    : value >= 100000
      ? `${(value / 100000).toFixed(2)}L`
      : value >= 1000
        ? `${(value / 1000).toFixed(1)}k`
        : String(value);
}
export function dateLabel(date: string, options?: Intl.DateTimeFormatOptions) {
  return new Date(`${date.slice(0, 10)}T12:00:00`).toLocaleDateString(
    "en-IN",
    options ?? { day: "2-digit", month: "short", year: "numeric" },
  );
}
export function uid() {
  return crypto.randomUUID();
}
export function sum<T>(items: T[], fn: (item: T) => number) {
  return items.reduce((total, item) => total + fn(item), 0);
}
export function monthlyTransactions(state: FinanceState, month: string) {
  return state.transactions.filter((t) => t.date.startsWith(month));
}
export function cashTotals(transactions: Transaction[]) {
  const income = sum(
    transactions.filter((t) => t.kind === "income"),
    (t) => t.amount,
  );
  const expense = sum(
    transactions.filter((t) => t.kind === "expense"),
    (t) => t.amount,
  );
  return {
    income,
    expense,
    net: income - expense,
    savingsRate: income ? ((income - expense) / income) * 100 : 0,
  };
}
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
