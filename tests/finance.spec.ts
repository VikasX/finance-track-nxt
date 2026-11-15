import { expect, test } from "@playwright/test";
import { amortization, calculateEMI, calculateFD } from "../src/lib/finance";
import { initialState } from "../src/lib/mock-data";
import {
  selectPortfolioHistory,
  selectPPFLedger,
  selectSummary,
} from "../src/lib/selectors";
import { validateBackup } from "../src/lib/backup";
import { parseCSV } from "../src/lib/csv";
test("mock ledgers reconcile dashboard totals and chart endpoints", () => {
  const summary = selectSummary(initialState, "2024-10");
  expect(summary.income).toBe(120000);
  expect(summary.expense).toBe(45000);
  expect(summary.net).toBe(75000);
  expect(summary.budgetSpent).toBe(summary.expense);
  expect(summary.equity).toBe(970000);
  expect(summary.portfolio).toBe(1250000);
  expect(selectPortfolioHistory(initialState, "1Y").at(-1)?.value).toBe(
    summary.equity,
  );
  const ppf = selectPPFLedger(initialState).at(-1)!;
  expect(ppf.closing - ppf.interest).toBe(summary.ppf);
});
test("calculators handle interest-free loans, annual compounding, and impossible repayments", () => {
  expect(calculateEMI(120000, 0, 12).emi).toBe(10000);
  expect(calculateEMI(100000, 12, 12).emi).toBeCloseTo(8884.88, 2);
  expect(calculateFD(100000, 10, 2, 1).maturity).toBeCloseTo(121000, 6);
  expect(amortization(100000, 12, 1000).months).toBe(Infinity);
  const base = amortization(100000, 12, 10000);
  const extra = amortization(100000, 12, 10000, 5000);
  expect(extra.interest).toBeLessThan(base.interest);
  expect(extra.months).toBeLessThan(base.months);
  expect(extra.rows.at(-1)?.balance).toBe(0);
});
test("backup validation rejects malformed and duplicate records, CSV handles escaping", () => {
  expect(validateBackup(initialState)).toBe(true);
  expect(validateBackup({ ...initialState, holdings: [{ id: "bad" }] })).toBe(
    false,
  );
  expect(
    validateBackup({
      ...initialState,
      transactions: [
        initialState.transactions[0],
        initialState.transactions[0],
      ],
    }),
  ).toBe(false);
  expect(
    parseCSV(
      '\uFEFFname,amount\r\n"Grocery, local",200\r\n"He said ""hello""",10',
    ),
  ).toEqual([
    ["name", "amount"],
    ["Grocery, local", "200"],
    ['He said "hello"', "10"],
  ]);
});
