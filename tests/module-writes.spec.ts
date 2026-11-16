import { expect, test } from "@playwright/test";
import { mockApi } from "./api-fixture";
const scenarios = [
  {
    route: "budgets",
    action: "Create New Budget",
    path: "/api/budgets",
    values: { "Monthly Limit (₹)": "999.99" },
    selects: { Category: "2" },
  },
  {
    route: "loans-emi",
    action: "Add New Loan",
    path: "/api/loans",
    values: {
      "Loan Name": "Contract Loan",
      "Loan Type": "personal",
      "Principal Amount (₹)": "1000.00",
      "Outstanding Balance (₹)": "1000.00",
      "Interest Rate (% p.a.)": "5.00",
      "Tenure (Months)": "12",
      "Stored Monthly EMI (₹)": "100.00",
    },
  },
  {
    route: "stocks-investments",
    action: "Add Investment",
    path: "/api/investments",
    values: {
      Name: "Contract Holding",
      "Quantity / Units": "1.0001",
      "Average Buy Price (₹)": "10.01",
      "Current Price (₹)": "11.01",
    },
  },
  {
    route: "fixed-deposits",
    action: "Open New FD",
    path: "/api/fixed-deposits",
    values: { "Bank Name": "Contract Bank" },
  },
  {
    route: "ppf-savings",
    action: "Add Account",
    path: "/api/ppf",
    values: { "Bank Name": "Contract PPF" },
  },
  {
    route: "ppf-savings",
    action: "Create New Goal",
    path: "/api/savings-goals",
    values: {
      Name: "Contract Goal",
      "Target Amount (₹)": "100.00",
      "Saved Amount (₹)": "10.00",
    },
  },
  {
    route: "calendar",
    action: "Add Reminder",
    path: "/api/reminders",
    values: { "Reminder Title": "Contract Reminder", "Amount (₹)": "10.00" },
  },
  {
    route: "settings",
    action: "Add Custom Category",
    path: "/api/categories",
    values: { Name: "Contract Category" },
    selects: { "Category Type": "expense" },
  },
];
for (const scenario of scenarios)
  test(`module create maps writable ${scenario.path} fields`, async ({
    page,
  }) => {
    const { writes } = await mockApi(page);
    await page.goto(`/${scenario.route}`);
    await page
      .getByRole("button", { name: scenario.action, exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    for (const [label, value] of Object.entries(scenario.values))
      await dialog.getByLabel(label, { exact: true }).fill(value);
    for (const [label, value] of Object.entries(scenario.selects ?? {}))
      await dialog.getByLabel(label, { exact: true }).selectOption(value);
    await dialog
      .getByRole("button", { name: "Create Record", exact: true })
      .click();
    await expect(page.locator(".toast")).toContainText("Record created");
    expect(writes).toHaveLength(1);
    expect(writes[0].path).toBe(scenario.path);
    if (scenario.path === "/api/budgets")
      expect(writes[0].body.category_id).toBe(2);
    for (const key of [
      "id",
      "user_id",
      "created_at",
      "spent_amount",
      "current_value",
      "calculated_emi",
      "estimated_maturity_value",
      "gain_loss",
      "progress_percent",
    ])
      expect(writes[0].body).not.toHaveProperty(key);
  });
