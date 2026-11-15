export type TransactionKind = "income" | "expense" | "investment" | "loan";
export interface Transaction {
  id: string;
  name: string;
  description: string;
  amount: number;
  kind: TransactionKind;
  category: string;
  channel: string;
  date: string;
}
export interface Budget {
  id: string;
  name: string;
  description: string;
  limit: number;
  icon: string;
  threshold: number;
  rollover: boolean;
}
export interface Holding {
  id: string;
  name: string;
  symbol: string;
  kind: "Stock" | "Mutual Fund";
  quantity: number;
  buyPrice: number;
  price: number;
  sip: number;
  sector: string;
}
export interface Deposit {
  id: string;
  bank: string;
  name: string;
  principal: number;
  rate: number;
  startDate: string;
  maturityDate: string;
  kind: "Regular" | "Tax Saver" | "Senior";
  instruction: string;
}
export interface Loan {
  id: string;
  name: string;
  bank: string;
  sanctioned: number;
  principal: number;
  rate: number;
  emi: number;
  months: number;
  dueDay: number;
  kind: "Home" | "Vehicle";
}
export interface Contribution {
  id: string;
  amount: number;
  date: string;
  method: string;
  reference: string;
}
export interface SavingsGoal {
  id: string;
  name: string;
  description: string;
  saved: number;
  target: number;
  sip: number;
  date: string;
  icon: string;
}
export interface FinancialEvent {
  id: string;
  title: string;
  amount: number;
  date: string;
  category:
    | "EMI / Loan"
    | "SIP / Mutual Fund"
    | "Utility Bill"
    | "Insurance"
    | "Subscription"
    | "Income"
    | "Maturity";
  paid: boolean;
  autoDebit: boolean;
  description: string;
}
export interface Preferences {
  name: string;
  email: string;
  phone: string;
  pan: string;
  currency: string;
  numberFormat: string;
  financialYear: string;
  budgetDay: string;
  notifications: boolean[];
  avatar: string;
}
export interface FinanceState {
  balances: { cashOpening: number; ppfOpening: number };
  transactions: Transaction[];
  budgets: Budget[];
  holdings: Holding[];
  deposits: Deposit[];
  loans: Loan[];
  contributions: Contribution[];
  goals: SavingsGoal[];
  events: FinancialEvent[];
  preferences: Preferences;
  categories: string[];
  strategy: { loanId: string; amount: number; mode: string } | null;
}
export type Collection =
  | "transactions"
  | "budgets"
  | "holdings"
  | "deposits"
  | "loans"
  | "contributions"
  | "goals"
  | "events";
