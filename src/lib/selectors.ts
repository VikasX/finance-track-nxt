import type { FinanceState } from "@/types/finance";
import { cashTotals, monthlyTransactions, sum } from "./finance";
import { portfolioHistory, ppfAnnualHistory } from "./mock-data";
export function selectSummary(state: FinanceState, month: string) {
  const transactions = monthlyTransactions(state, month);
  const cash = cashTotals(transactions);
  const stocks = sum(
    state.holdings.filter((h) => h.kind === "Stock"),
    (h) => h.quantity * h.price,
  );
  const funds = sum(
    state.holdings.filter((h) => h.kind === "Mutual Fund"),
    (h) => h.quantity * h.price,
  );
  const invested = sum(state.holdings, (h) => h.quantity * h.buyPrice);
  const deposits = sum(state.deposits, (d) => d.principal);
  const contribution = sum(state.contributions, (c) => c.amount);
  const ppf = state.balances.ppfOpening + contribution;
  const allocation = [
    { name: "Stocks (Direct Equity)", value: stocks },
    { name: "Mutual Funds (SIPs)", value: funds },
    { name: "Fixed Deposits", value: deposits },
    { name: "PPF & Govt Bonds", value: ppf },
  ];
  const budgets = state.budgets.map((budget) => ({
    ...budget,
    spent: sum(
      transactions.filter(
        (t) => t.kind === "expense" && t.category === budget.name,
      ),
      (t) => t.amount,
    ),
  }));
  const [year, selectedMonth] = month.split("-").map(Number);
  const cashflow = Array.from({ length: selectedMonth }, (_, index) => {
    const prefix = `${year}-${String(index + 1).padStart(2, "0")}`;
    const totals = cashTotals(monthlyTransactions(state, prefix));
    return {
      name: new Date(year, index, 1).toLocaleDateString("en-IN", {
        month: "short",
      }),
      income: totals.income,
      expense: totals.expense,
    };
  });
  return {
    ...cash,
    cashBalance: state.balances.cashOpening + cash.net,
    transactions,
    stocks,
    funds,
    equity: stocks + funds,
    invested,
    deposits,
    ppf,
    contribution,
    portfolio: sum(allocation, (a) => a.value),
    allocation,
    budgets,
    cashflow,
    budgetLimit: sum(budgets, (b) => b.limit),
    budgetSpent: sum(budgets, (b) => b.spent),
  };
}

export function selectPortfolioHistory(state: FinanceState, period: string) {
  const value = sum(state.holdings, (h) => h.quantity * h.price);
  const invested = sum(state.holdings, (h) => h.quantity * h.buyPrice);
  const history = portfolioHistory.map((ratio, index) => ({
    name: new Date(2022, 10 + index, 1).toLocaleDateString("en-IN", {
      month: "short",
      year: "2-digit",
    }),
    value: Math.round(value * ratio),
    invested: Math.round(
      invested * (0.3 + (index / (portfolioHistory.length - 1)) * 0.7),
    ),
  }));
  return period === "6M"
    ? history.slice(-6)
    : period === "1Y"
      ? history.slice(-12)
      : history;
}

export function selectPortfolioMix(state: FinanceState) {
  const total = sum(
    state.holdings,
    (holding) => holding.quantity * holding.price,
  );
  const stockTotal = sum(
    state.holdings.filter((h) => h.kind === "Stock"),
    (h) => h.quantity * h.price,
  );
  const ratio = (value: number) => (total ? (value / total) * 100 : 0);
  const caps = [
    {
      label: "Large Cap Equities",
      value: ratio(
        sum(
          state.holdings.filter(
            (h) => !["Flexi Cap", "Debt"].includes(h.sector),
          ),
          (h) => h.quantity * h.price,
        ),
      ),
      tone: "purple",
    },
    {
      label: "Flexi & Mid Cap",
      value: ratio(
        sum(
          state.holdings.filter((h) => h.sector === "Flexi Cap"),
          (h) => h.quantity * h.price,
        ),
      ),
      tone: "light",
    },
    {
      label: "Debt & Arbitrage",
      value: ratio(
        sum(
          state.holdings.filter((h) => h.sector === "Debt"),
          (h) => h.quantity * h.price,
        ),
      ),
      tone: "green",
    },
  ];
  const sectors = Array.from(
    new Set(
      state.holdings.filter((h) => h.kind === "Stock").map((h) => h.sector),
    ),
  )
    .map((name) => ({
      name,
      value: stockTotal
        ? (sum(
            state.holdings.filter(
              (h) => h.kind === "Stock" && h.sector === name,
            ),
            (h) => h.quantity * h.price,
          ) /
            stockTotal) *
          100
        : 0,
    }))
    .sort((a, b) => b.value - a.value);
  return { caps, sectors };
}

export function selectPPFLedger(state: FinanceState) {
  const contribution = sum(state.contributions, (c) => c.amount);
  const opening = state.balances.ppfOpening;
  const interest = Math.round(
    Array.from({ length: 12 }, (_, index) => {
      const date = new Date(2024, 3 + index, 5);
      const cutoff = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-05`;
      return (
        ((opening +
          sum(
            state.contributions.filter((c) => c.date <= cutoff),
            (c) => c.amount,
          )) *
          0.071) /
        12
      );
    }).reduce((total, amount) => total + amount, 0),
  );
  if (!opening && !state.contributions.length) return [];
  return [
    ...(opening ? ppfAnnualHistory : []),
    {
      id: "fy-current",
      date: "2025-03-31",
      year: "FY 2024–25 (Active)",
      opening,
      deposit: contribution,
      interest,
      closing: opening + contribution + interest,
      reference: "Projected interest at current rate",
      projected: true,
    },
  ];
}
