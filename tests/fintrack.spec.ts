import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
const routes = [
  ["dashboard", "Financial Overview"],
  ["income-expenses", "Income & Expenses"],
  ["budgets", "Monthly Budgets"],
  ["loans-emi", "Loans & EMI"],
  ["stocks-investments", "Stocks & Mutual Funds"],
  ["fixed-deposits", "Fixed Deposits"],
  ["ppf-savings", "PPF & Savings"],
  ["reports-analytics", "Reports & Analytics"],
  ["calendar", "Financial Calendar"],
  ["settings", "Settings"],
];
test("all sidebar routes render and activate their navigation link without runtime errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const [route, title] of routes) {
    const response = await page.goto(`/${route}`);
    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole("heading", { level: 1, name: title, exact: true }),
    ).toBeVisible();
    await expect(page.locator(`nav a[href="/${route}"]`)).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(page.locator("body")).not.toContainText("Application error");
  }
  expect(errors).toEqual([]);
});
test("transactions add, search, edit, sort, paginate and delete with shared persistence", async ({
  page,
}) => {
  await page.goto("/income-expenses");
  await page
    .getByRole("button", { name: "Add Transaction", exact: true })
    .last()
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Amount (₹)", { exact: true }).fill("2000");
  await dialog.getByLabel("Merchant / Reference").fill("Test Grocery Shop");
  await dialog.getByRole("button", { name: "Save Transaction" }).click();
  await page.getByLabel("Search ledger").fill("Test Grocery Shop");
  await expect(
    page.getByRole("row").filter({ hasText: "Test Grocery Shop" }),
  ).toHaveCount(1);
  await page.getByLabel("Edit Test Grocery Shop", { exact: true }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Amount (₹)", { exact: true })
    .fill("2500");
  await page.getByRole("button", { name: "Save Transaction" }).click();
  await expect(
    page.getByRole("row").filter({ hasText: "Test Grocery Shop" }),
  ).toContainText("₹2,500.00");
  await page.reload();
  await page.getByLabel("Search ledger").fill("Test Grocery Shop");
  await expect(
    page.getByRole("row").filter({ hasText: "Test Grocery Shop" }),
  ).toHaveCount(1);
  await page.getByLabel("Delete Test Grocery Shop", { exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await expect(
    page.getByText("No records match your selection."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await page.getByLabel("Next page", { exact: true }).click();
  await expect(page.locator(".page-number")).toContainText("2 /");
  await page
    .getByRole("columnheader")
    .getByRole("button", { name: /Amount/ })
    .click();
  await expect(
    page.getByRole("columnheader", { name: /Amount/ }),
  ).toHaveAttribute("aria-sort", "ascending");
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: "Financial Overview" }),
  ).toBeVisible();
});
test("budget edits change allocations and dashboard totals", async ({
  page,
}) => {
  await page.goto("/budgets");
  await page
    .locator(".budget-card")
    .filter({ hasText: "Food & Dining" })
    .getByRole("button", { name: "Edit Budget" })
    .click();
  await page.getByRole("dialog").getByLabel("Monthly Limit (₹)").fill("20000");
  await page.getByRole("button", { name: "Save Envelope" }).click();
  await expect(
    page.locator(".budget-card").filter({ hasText: "Food & Dining" }),
  ).toContainText("₹20,000");
  await page.goto("/dashboard");
  await expect(page.getByText("Total Cap: ₹61,500")).toBeVisible();
  await page.goto("/budgets");
  await page.getByRole("tab", { name: /Alerts/ }).click();
  await expect(page.locator(".budget-card")).toHaveCount(2);
});
test("FD and EMI calculators react to inputs, and prepayment strategy saves", async ({
  page,
}) => {
  await page.goto("/fixed-deposits");
  const original = await page.getByTestId("fd-maturity").innerText();
  await page.getByLabel("Deposit Amount (₹)", { exact: true }).fill("200000");
  await expect(page.getByTestId("fd-maturity")).not.toHaveText(original);
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(page.getByTestId("fd-maturity")).toHaveText(original);
  await page.goto("/loans-emi");
  const emi = await page.getByTestId("loan-emi").innerText();
  await page.getByLabel("Loan Amount (₹)", { exact: true }).fill("4000000");
  await expect(page.getByTestId("loan-emi")).not.toHaveText(emi);
  await page
    .getByRole("button", { name: "Prepayment Simulator", exact: true })
    .click();
  await expect(page.getByTestId("interest-saved")).not.toHaveText("₹0");
  await page.getByRole("button", { name: "Save Strategy to Profile" }).click();
  await expect(page.getByText(/Saved: ₹5,000/)).toBeVisible();
});
test("investment purchase and redemption update the portfolio", async ({
  page,
}) => {
  await page.goto("/stocks-investments");
  await page
    .getByRole("button", { name: "Add Investment", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Asset Symbol", { exact: true }).fill("TESTFUND");
  await dialog.getByLabel("Scheme / Company Name").fill("Test Fund");
  await dialog.getByLabel("Quantity / Units", { exact: true }).fill("10");
  await dialog.getByLabel("Buy Price (₹)").fill("100");
  await dialog.getByRole("button", { name: "Confirm & Add Holding" }).click();
  await page.getByLabel("Filter holdings").fill("TESTFUND");
  await expect(
    page.getByRole("row").filter({ hasText: "Test Fund" }),
  ).toHaveCount(1);
  await page.getByLabel("Sell TESTFUND", { exact: true }).click();
  await page.getByRole("button", { name: "Confirm Redemption" }).click();
  await expect(
    page.getByText("No records match your selection."),
  ).toBeVisible();
});
test("PPF contribution updates annual allowance and savings goal can be created", async ({
  page,
}) => {
  await page.goto("/ppf-savings");
  await page
    .getByRole("button", { name: "Log Contribution", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Contribution Amount (₹)").fill("10000");
  await dialog.getByLabel("Bank Reference / UTR Number").fill("TEST-UTR");
  await dialog.getByRole("button", { name: "Record Deposit" }).click();
  await expect(
    page.getByText("Remaining Tax Exemption Room: ₹65,000"),
  ).toBeVisible();
  await page.getByRole("button", { name: /Create New Goal/ }).click();
  const goal = page.getByRole("dialog");
  await goal.getByLabel("Goal Name").fill("Education Goal");
  await goal.getByLabel("Description", { exact: true }).fill("Advanced degree");
  await goal.getByLabel("Target Amount (₹)").fill("500000");
  await goal.getByLabel("Target Date").fill("2027-06-01");
  await goal.getByRole("button", { name: "Save Goal" }).click();
  await expect(
    page.getByRole("heading", { name: "Education Goal", exact: true }),
  ).toBeVisible();
});
test("calendar month/week/agenda, reminder creation and payment completion work", async ({
  page,
}) => {
  await page.goto("/calendar");
  await page.getByRole("button", { name: "Add Reminder", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Reminder Title").fill("Test Insurance");
  await dialog.getByLabel("Amount (₹)", { exact: true }).fill("3000");
  await dialog
    .getByLabel("Category", { exact: true })
    .selectOption("Insurance");
  await dialog.getByRole("button", { name: "Set Reminder" }).click();
  await expect(
    page.locator(".agenda-item").filter({ hasText: "Test Insurance" }),
  ).toBeVisible();
  await page
    .locator(".agenda-item")
    .filter({ hasText: "Test Insurance" })
    .getByRole("button", { name: "Mark as Paid" })
    .click();
  await expect(
    page.locator(".agenda-item").filter({ hasText: "Test Insurance" }),
  ).toContainText("Completed");
  await page.getByRole("tab", { name: "Week", exact: true }).click();
  await expect(page.locator(".calendar-cell")).toHaveCount(7);
  await page.getByRole("tab", { name: "Agenda", exact: true }).click();
  await expect(
    page.locator(".calendar-agenda-row").filter({ hasText: "Test Insurance" }),
  ).toBeVisible();
  await page.getByLabel("Next month", { exact: true }).click();
  await expect(
    page.getByRole("heading", { level: 2, name: "November 2024", exact: true }),
  ).toBeVisible();
});
test("reports filter data and generate real PDF, CSV, ZIP and Excel files", async ({
  page,
}) => {
  await page.goto("/reports-analytics");
  await page
    .getByLabel("Report date range")
    .selectOption("Q3 2024 (Jul - Sep)");
  await page.getByRole("tab", { name: "vs Last Year" }).click();
  await expect(page.getByText("No prior-year data to compare")).toBeVisible();
  for (const name of [
    "Export PDF",
    "Export CSV",
    "Download Pack",
    "Download XLS",
  ]) {
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name, exact: true }).click();
    const result = await download;
    expect(await result.failure()).toBeNull();
    expect(result.suggestedFilename()).toMatch(/\.(pdf|csv|zip|xml)$/);
  }
  await page
    .getByRole("button", { name: "Preview", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("dialog", { name: "Monthly Ledger Statement" }),
  ).toBeVisible();
});
test("settings profile saves, backup downloads and notification toggles persist", async ({
  page,
}) => {
  await page.goto("/settings");
  await page
    .getByLabel("Full Legal Name", { exact: true })
    .fill("Jordan Morgan");
  const toggle = page.getByRole("switch", { name: "Weekly Spending Digest" });
  await toggle.click();
  await page.getByRole("button", { name: "Save Changes", exact: true }).click();
  await page.reload();
  await expect(page.getByLabel("Full Legal Name", { exact: true })).toHaveValue(
    "Jordan Morgan",
  );
  await expect(
    page.getByRole("switch", { name: "Weekly Spending Digest" }),
  ).toHaveAttribute("aria-checked", "true");
  const downloaded = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export Full Backup (JSON)", exact: true })
    .click();
  expect((await downloaded).suggestedFilename()).toBe("fintrack-backup.json");
});

test("CSV import handles quoted entities and header search updates the current ledger route", async ({
  page,
}) => {
  await page.goto("/income-expenses");
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "transactions.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(
        'name,amount,date,kind,category,channel\r\n"Test Shop, Mumbai",100,2024-10-22,expense,Food & Dining,Cash',
      ),
    });
  await expect(page.getByRole("status")).toContainText(
    "Imported 1 transactions",
  );
  await page
    .getByLabel("Search transactions, assets, ledgers", { exact: true })
    .fill("Test Shop");
  await page.locator(".search-results a").first().click();
  await expect(page.getByLabel("Search ledger")).toHaveValue(
    "Test Shop, Mumbai",
  );
  await expect(
    page.getByRole("row").filter({ hasText: "Test Shop, Mumbai" }),
  ).toHaveCount(1);
});

test("backup import, cross-tab updates and confirmed record reset work", async ({
  page,
  context,
}) => {
  await page.goto("/settings");
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export Full Backup (JSON)" }).click();
  const backup = await downloaded;
  const path = await backup.path();
  const bytes = await readFile(path!);
  const other = await context.newPage();
  await other.goto("/dashboard");
  await page.getByRole("button", { name: "Delete Financial Records" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await expect(
    other.locator(".metric").first().locator(".metric-value"),
  ).toHaveText("₹0");
  await expect(
    other.locator(".metric").last().locator(".metric-value"),
  ).toHaveText("₹0");
  await page
    .locator('input[accept=".json,application/json"]')
    .setInputFiles({
      name: "backup.json",
      mimeType: "application/json",
      buffer: bytes,
    });
  await expect(page.getByRole("status")).toContainText(
    "Backup restored successfully",
  );
  await expect(
    other.locator(".metric").last().locator(".metric-value"),
  ).toHaveText("₹12,50,000");
  await other.close();
});
test("all routes fit a mobile viewport and drawer navigation works", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [route, title] of routes) {
    await page.goto(`/${route}`);
    await expect(
      page.getByRole("heading", { level: 1, name: title, exact: true }),
    ).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 1,
    );
    expect(overflow, `Horizontal page overflow on ${route}`).toBe(false);
  }
  await page.getByLabel("Open navigation", { exact: true }).click();
  await expect(page.locator(".sidebar")).toHaveClass(/sidebar-open/);
  await page
    .locator("nav")
    .getByRole("link", { name: "Dashboard", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Financial Overview", exact: true }),
  ).toBeVisible();
});
